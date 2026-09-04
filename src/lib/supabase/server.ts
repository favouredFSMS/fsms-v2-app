import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * FSMS V2 — Supabase client factory (server variant).
 *
 * Uses the SERVICE-ROLE key: bypasses RLS, so callers are responsible for
 * authorization checks. This client must only be used in server-side modules
 * (Route Handlers, Server Actions, background jobs). For user-scoped queries,
 * prefer the authenticated browser client or a user-context client.
 */

let client: SupabaseClient | null = null;

export function getServerClient(): SupabaseClient {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    );
  }
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
