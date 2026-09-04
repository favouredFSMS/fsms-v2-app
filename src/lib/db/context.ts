import "server-only";
import type { AuthProfile } from "@/lib/auth/types";
import { getAuthProfile } from "@/lib/auth/session";
import { isLocalAuthEnabled } from "@/lib/auth/local";
import type { DbAdapter } from "./adapter";
import { PgAdapter } from "./pg-adapter";
import { SupabaseAdapter } from "./supabase-adapter";
import { ServiceError } from "./errors";

/**
 * FSMS V2 — data-access context (Phase 10).
 *
 * One `DbContext` per request: the resolved caller profile + a user-scoped
 * database adapter. Repositories receive the context and are the ONLY modules
 * that touch the database (architecture §7).
 */
export interface DbContext {
  profile: AuthProfile;
  db: DbAdapter;
}

/** Resolve the caller + adapter for the current request, or null if anonymous. */
export async function getDbContext(): Promise<DbContext | null> {
  const profile = await getAuthProfile();
  if (!profile) return null;

  const db: DbAdapter = isLocalAuthEnabled()
    ? new PgAdapter(profile.id)
    : new SupabaseAdapter();

  return { profile, db };
}

/** Like getDbContext(), but fails closed (401) when there is no session. */
export async function requireDbContext(): Promise<DbContext> {
  const ctx = await getDbContext();
  if (!ctx) {
    throw new ServiceError("unauthenticated", 401, "Sign in required");
  }
  if (ctx.profile.status !== "active") {
    throw new ServiceError("inactive", 403, "Account is not active");
  }
  return ctx;
}
