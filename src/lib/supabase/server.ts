import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

/**
 * FSMS V2 — Supabase client factories (server).
 *
 *  - getServerClient(): SERVICE-ROLE client — bypasses RLS. Server-only,
 *    callers must perform their own authorization checks.
 *  - createSupabaseServerClient(): cookie/session-scoped client (Supabase SSR).
 *    All user-facing queries go through this so RLS applies as the signed-in
 *    user.
 */

let serviceClient: SupabaseClient | null = null;

export function getServerClient(): SupabaseClient {
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    );
  }
  if (!serviceClient) {
    serviceClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return serviceClient;
}

/** Cookie-scoped client for the current request (App Router / Server Components). */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as CookieOptions),
          );
        } catch {
          // Called from a Server Component — the middleware refreshes sessions,
          // so it is safe to ignore here.
        }
      },
    },
  });
}
