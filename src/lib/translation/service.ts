import "server-only";

import { createHash } from "node:crypto";

import type { DbContext } from "@/lib/db/context";
import { getTranslationProvider, type AppLocale } from "./provider";

/**
 * FSMS V2 — dynamic-content translation service (O3, Phase 26).
 *
 * Translates teacher-authored content on demand, caching the result in the
 * `content_translations` table keyed by content hash + locale (shared,
 * content-addressed cache — identical text translates identically, so cached
 * values carry no tenant-specific data).
 *
 * Returns the translated text, or null when no provider is configured or the
 * provider failed — callers then fall back to the original content. Original
 * content is NEVER overwritten.
 */

export function contentHash(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export async function translateDynamicContent(
  ctx: DbContext,
  text: string,
  targetLocale: AppLocale,
): Promise<string | null> {
  if (!text.trim()) return null;
  const hash = contentHash(text);

  // 1. Cache hit?
  const hit = await ctx.db.rpc<Record<string, unknown> | null>("resolve_translation", {
    p_hash: hash,
    p_locale: targetLocale,
  });
  if (!hit.error && hit.data) {
    const translated = (hit.data as { translated?: string }).translated;
    if (typeof translated === "string" && translated.length) return translated;
  }

  // 2. Provider call.
  const translated = await getTranslationProvider().translate(text, targetLocale);
  if (!translated) return null;

  // 3. Cache the result (best-effort — a cache write failure must not fail the
  //    request).
  await ctx.db.rpc("save_translation", {
    p_hash: hash,
    p_locale: targetLocale,
    p_fields: { translated, provider: "google", at: new Date().toISOString() },
  });

  return translated;
}
