import "server-only";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import type { AuthProfile } from "@/lib/auth/types";
import { LOCAL_SESSION_COOKIE, verifyLocalSessionToken } from "@/lib/auth/local-session";
import { fetchProfileFor } from "@/lib/auth/local-db";

/**
 * FSMS V2 — LOCAL-ONLY dev auth adapter (request-scoped facade).
 *
 * When Supabase is not provisioned (sandbox / local dev), this adapter provides
 * the same surface as Supabase Auth against the local PostgreSQL harness:
 *   login → bcrypt-verified credentials (auth.local_verify) + HMAC-signed cookie
 *   session → HMAC-verified cookie → request.jwt.claim.sub → fsms.current_profile()
 *
 * This is a DEVELOPMENT harness, never a production path: it is hard-disabled in
 * production builds (see isLocalAuthEnabled). Production auth is Supabase GoTrue.
 */

export { issueLocalSession, LOCAL_SESSION_COOKIE } from "@/lib/auth/local-session";
export { verifyLocalCredentials } from "@/lib/auth/local-db";

export function isLocalAuthEnabled(): boolean {
  return env.authMode === "local" && !env.supabaseUrl && process.env.NODE_ENV !== "production";
}

/** Read + verify the dev session cookie. */
export async function readLocalSession(): Promise<{ sub: string; email?: string } | null> {
  if (!isLocalAuthEnabled()) return null;
  const store = await cookies();
  const token = store.get(LOCAL_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyLocalSessionToken(token);
}

/** Resolve the caller's profile against the local harness. */
export async function fetchLocalProfile(): Promise<AuthProfile | null> {
  if (!isLocalAuthEnabled()) return null;
  const session = await readLocalSession();
  if (!session) return null;
  return fetchProfileFor(session.sub);
}
