import "server-only";
import { env } from "@/lib/env";
import type { AiProviderStatus } from "@/lib/db/repos/ai";
import type { AiBudget } from "./engine";

/**
 * FSMS V2 — AI runtime config (Phase 21). Server-only.
 *
 * Assembles the provider keyring from environment variables (never the DB) and
 * the budget/rate controls. `configuredFlags` tells the UI which providers
 * actually have a key set, without exposing any key material.
 */

export function aiKeyring(): Record<string, string> {
  const ring: Record<string, string> = {};
  if (env.geminiApiKey) ring.gemini = env.geminiApiKey;
  if (env.groqApiKey) ring.groq = env.groqApiKey;
  if (env.openRouterApiKey) ring.openrouter = env.openRouterApiKey;
  for (const k of Object.keys(process.env)) {
    if (k.startsWith("FSMS_AI_KEY_") && process.env[k]) {
      ring[k.slice("FSMS_AI_KEY_".length).toLowerCase()] = process.env[k] as string;
    }
  }
  return ring;
}

export function aiBudget(): AiBudget {
  return {
    maxDailyCost: env.aiMaxDailyCost,
    maxTokensPerCall: env.aiMaxTokensPerCall,
    requestsPerMinute: env.aiRequestsPerMinute,
  };
}

export function toRuntime(providers: AiProviderStatus[]) {
  return providers.map((p) => ({
    key_slug: p.key_slug,
    label: p.label,
    kind: p.kind as "openai" | "gemini",
    base_url: p.base_url,
    model: p.model,
    enabled: p.enabled,
  }));
}
