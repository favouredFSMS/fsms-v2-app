"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * FSMS V2 — Supabase client factory (browser variant).
 *
 * Uses the anon key and relies entirely on Row Level Security (ADR-9) for
 * authorization. Never constructed until a component actually needs it, so an
 * unconfigured environment does not break static rendering.
 */

let client: SupabaseClient | null = null;

export function getBrowserClient(): SupabaseClient {
  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.",
    );
  }
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseAnonKey);
  }
  return client;
}
