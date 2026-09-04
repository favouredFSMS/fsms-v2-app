/**
 * FSMS V2 — typed environment access.
 *
 * Secrets are environment variables ONLY (never in the repo — Phase 0 policy,
 * roadmap Phase 28). Values are read lazily via getters so that importing this
 * module in a browser bundle never evaluates server-only variables (which are
 * undefined client-side and must not throw at build time).
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
    return read("NEXT_PUBLIC_SUPABASE_URL");
  },
  /** Supabase anon key (public — RLS enforces access). */
  get supabaseAnonKey(): string {
    return read("NEXT_PUBLIC_SUPABASE_ANON_KEY");
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
    return read("NEXT_PUBLIC_APP_URL", false, "http://localhost:3000");
  },
} as const;
