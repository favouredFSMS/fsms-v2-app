/**
 * Phase 24/29 — language switching at the persistence layer (integration).
 * Verifies set_profile_locale persists the per-user UI language and that an
 * unsupported locale is rejected (enum). Runs against the local Postgres
 * harness (skips when unreachable); restores the owner's locale afterwards.
 */
import { afterAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { fetchProfileFor } from "@/lib/auth/local-db";
import { PgAdapter } from "@/lib/db/pg-adapter";
import type { DbContext } from "@/lib/db/context";

const dbUrl = process.env.LOCAL_DB_URL ?? "postgres://fsms:fsms_dev@127.0.0.1:5432/fsms_v2";
const OWNER = "00000000-0000-0000-0000-000000000201";

let reachable = false;
try {
  const c = new Client({ connectionString: dbUrl });
  await c.connect();
  await c.query("select 1");
  await c.end();
  reachable = true;
} catch {
  reachable = false;
}

async function ctxFor(sub: string): Promise<DbContext> {
  const profile = await fetchProfileFor(sub);
  if (!profile) throw new Error(`no profile for ${sub}`);
  return { profile, db: new PgAdapter(sub) };
}

afterAll(async () => {
  if (!reachable) return;
  const c = new Client({ connectionString: dbUrl });
  await c.connect();
  try {
    await c.query("update public.profiles set locale = 'en' where id = $1", [OWNER]);
  } finally {
    await c.end();
  }
});

describe.skipIf(!reachable)("language switching (integration)", () => {
  it("persists a chosen locale and reflects it in the profile", async () => {
    const ctx = await ctxFor(OWNER);
    const res = await ctx.db.rpc<string>("set_profile_locale", { p_locale: "ru" });
    expect(res.error).toBeNull();
    expect(res.data).toBe("ru");

    const profile = await fetchProfileFor(OWNER);
    expect(profile?.locale).toBe("ru");
  });

  it("rejects an unsupported locale (enum cast fails)", async () => {
    const ctx = await ctxFor(OWNER);
    const res = await ctx.db.rpc<string>("set_profile_locale", { p_locale: "de" });
    expect(res.error).not.toBeNull();
  });

  it("switches across the full supported set (en→fr→zh→en)", async () => {
    const ctx = await ctxFor(OWNER);
    for (const loc of ["fr", "zh", "en"] as const) {
      const res = await ctx.db.rpc<string>("set_profile_locale", { p_locale: loc });
      expect(res.error).toBeNull();
      expect(res.data).toBe(loc);
    }
    const profile = await fetchProfileFor(OWNER);
    expect(profile?.locale).toBe("en");
  });
});
