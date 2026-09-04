/**
 * FSMS V2 — typed environment access.
 *
 * Secrets are environment variables ONLY (never in the repo — Phase 0 policy,
 * roadmap Phase 28). Public values use direct `process.env.NEXT_PUBLIC_*`
 * references so Next.js inlines them into the browser bundle; server-only
 * values are read lazily via `read()` and must never be touched by client code.
 */

const read = (name: string, required = false, fallback = ""): string => {
  const v = process.env[name];
  if (!v) {
    if (required && process.env.NODE_ENV === "production") {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return fallback;
  }
  return v;
};

export const env = {
  /** Supabase project URL (public, safe for the browser). */
  get supabaseUrl(): string {
    return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  },
  /** Supabase anon key (public — RLS enforces access). */
  get supabaseAnonKey(): string {
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  },
  /** Service-role key. SERVER-SIDE ONLY — never access from client code. */
  get supabaseServiceRoleKey(): string {
    return read("SUPABASE_SERVICE_ROLE_KEY", true);
  },

  /** Resend API key (O5). SERVER-SIDE ONLY. */
  get resendApiKey(): string {
    return read("RESEND_API_KEY", true);
  },
  get emailFrom(): string {
    return read("EMAIL_FROM", false, "FSMS <noreply@localhost>");
  },

  /** AI provider keys (Phase 21). SERVER-SIDE ONLY. */
  get geminiApiKey(): string {
    return read("GEMINI_API_KEY");
  },
  get groqApiKey(): string {
    return read("GROQ_API_KEY");
  },
  get openRouterApiKey(): string {
    return read("OPENROUTER_API_KEY");
  },

  /** Translation provider (O3). SERVER-SIDE ONLY. */
  get googleTranslateApiKey(): string {
    return read("GOOGLE_TRANSLATE_API_KEY");
  },

  /** Canonical app URL (O4) — used in email/notification links. */
  get appUrl(): string {
    return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  },

  /**
   * Auth mode: "supabase" (production) or "local" (dev-only harness).
   * Defaults to "local" only when no Supabase URL is configured. The local
   * path is hard-disabled in production builds (fail-closed to Supabase).
   */
  get authMode(): string {
    return read("AUTH_MODE", false, this.supabaseUrl ? "supabase" : "local");
  },
  /** LOCAL-ONLY harness DB (never used in production). SERVER-SIDE ONLY. */
  get localDbUrl(): string {
    return read("LOCAL_DB_URL", false, "postgres://fsms:fsms_dev@127.0.0.1:5432/fsms_v2");
  },
  /** LOCAL-ONLY dev session signing secret (replaced by Supabase Auth in prod). */
  get localAuthSecret(): string {
    return read("AUTH_LOCAL_SECRET", false, "fsms-local-dev-secret-change-me");
  },
} as const;
