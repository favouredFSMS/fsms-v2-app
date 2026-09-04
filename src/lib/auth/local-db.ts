/**
 * FSMS V2 — LOCAL-ONLY dev adapter DB access (no request context, testable).
 *
 * Speaks to the local PostgreSQL harness directly: bcrypt credential checks and
 * profile bootstrap. Never used in production (Supabase GoTrue + PostgREST).
 */
import { Client } from "pg";
import { env } from "@/lib/env";
import type { AuthProfile } from "@/lib/auth/types";

/** Verify credentials against the local harness (returns the user id or null). */
export async function verifyLocalCredentials(email: string, password: string): Promise<string | null> {
  if (!email || !password) return null;
  const client = new Client({ connectionString: env.localDbUrl });
  await client.connect();
  try {
    const { rows } = await client.query("select auth.local_verify($1, $2) as id", [email, password]);
    return (rows[0]?.id as string | null) ?? null;
  } finally {
    await client.end();
  }
}

/** Resolve a caller's profile by user id against the local harness. */
export async function fetchProfileFor(sub: string): Promise<AuthProfile | null> {
  const client = new Client({ connectionString: env.localDbUrl });
  await client.connect();
  try {
    // Impersonate the signed-in user within ONE transaction: set_config(…, true)
    // is transaction-scoped, so the claim must be set and read in the same txn.
    await client.query("begin");
    try {
      await client.query("select set_config('request.jwt.claim.sub', $1, true)", [sub]);
      const { rows } = await client.query("select fsms.current_profile() as profile");
      return (rows[0]?.profile as AuthProfile | null) ?? null;
    } finally {
      await client.query("rollback");
    }
  } finally {
    await client.end();
  }
}
