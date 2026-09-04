import "server-only";
import type { AuthProfile } from "@/lib/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { readLocalSession, fetchLocalProfile, isLocalAuthEnabled } from "@/lib/auth/local";

/**
 * FSMS V2 — server session resolution.
 *
 * Production path: Supabase Auth session (cookie) → `public.current_profile()`.
 * Local-dev path (AUTH_MODE=local, no Supabase): a signed dev session cookie
 * resolved against the local PostgreSQL harness. Both return the same
 * `AuthProfile` shape so the rest of the app is transport-agnostic.
 */

export interface SessionUser {
  id: string;
  email?: string | null;
}

/** Resolve the signed-in user id (and email when available), or null. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  if (isLocalAuthEnabled()) {
    const s = await readLocalSession();
    return s ? { id: s.sub, email: s.email } : null;
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { id: user.id, email: user.email } : null;
}

/** Full profile bootstrap from the DB (role, school, locale, permissions). */
export async function getAuthProfile(): Promise<AuthProfile | null> {
  if (isLocalAuthEnabled()) {
    return fetchLocalProfile();
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("current_profile");
  if (error) {
    // Not signed in, or profile missing (e.g. no auth.users row) — treat as anonymous.
    return null;
  }
  return (data as AuthProfile) ?? null;
}

/** One call: signed-in user + profile, or null. */
export async function getSessionProfile(): Promise<{ user: SessionUser; profile: AuthProfile } | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const profile = await getAuthProfile();
  if (!profile) return null;
  return { user, profile };
}
