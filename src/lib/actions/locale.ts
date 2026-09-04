"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireDbContext } from "@/lib/db";
import { LOCALE_COOKIE, isAppLocale } from "@/i18n/locales";

/**
 * FSMS V2 — language switcher action (Phase 24).
 *
 * Persists the user's UI language in BOTH places:
 *  - durable: `profiles.locale` via `fsms.set_profile_locale` (survives logout);
 *  - request: the `fsms_locale` cookie, so `i18n/request.ts` resolves it on the
 *    next render without a DB round-trip.
 *
 * Switching language never logs the user out, deletes data or resets profiles —
 * it only flips the two locale mirrors above (per the Phase 24 requirement).
 */
export async function setLocaleAction(locale: string): Promise<{ ok: boolean }> {
  if (!isAppLocale(locale)) return { ok: false };

  try {
    const ctx = await requireDbContext();
    await ctx.db.rpc<string | null>("set_profile_locale", { p_locale: locale });
  } catch {
    // No session (or the write failed): still switch the cookie so anonymous
    // pages (login) render in the chosen language.
  }

  (await cookies()).set(LOCALE_COOKIE, locale, {
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
