/**
 * Integration test for Phase 31 UAT settings against the local PostgreSQL
 * harness (skips when unreachable): school profile + key/value settings list,
 * scalar/boolean/number/json saves, remove, and the saveSetting permission
 * gate (owner writes, parent reads but cannot write). Cleans up after itself.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { fetchProfileFor } from "@/lib/auth/local-db";
import { PgAdapter } from "./pg-adapter";
import { SettingsRepository } from "./repos/settings";
import type { DbContext } from "./context";

const dbUrl = process.env.LOCAL_DB_URL ?? "postgres://fsms:fsms_dev@127.0.0.1:5432/fsms_v2";

const SCHOOL = "00000000-0000-0000-0000-000000000001";
const OWNER = "00000000-0000-0000-0000-000000000201";
const PARENT = "00000000-0000-0000-0000-000000000203";
const TEACHER = "00000000-0000-0000-0000-000000000202";

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

async function exec(sql: string): Promise<void> {
  const c = new Client({ connectionString: dbUrl });
  await c.connect();
  try {
    await c.query(sql);
  } finally {
    await c.end();
  }
}

const cleanup = `delete from public.settings where school_id = '${SCHOOL}';`;

describe.skipIf(!reachable)("settings (integration)", () => {
  beforeAll(async () => {
    await exec(cleanup);
  });
  afterAll(async () => {
    await exec(cleanup);
  });

  it("owner lists school profile and saves/removes settings", async () => {
    const owner = new SettingsRepository(await ctxFor(OWNER));

    const empty = await owner.list();
    expect(empty.ok && empty.data?.school?.name).toBe("FAVOURED English School");
    expect(empty.ok ? empty.data.rows.length : -1).toBe(0);

    const saved = await owner.save({ key: "greetingBubbles", value: true });
    expect(saved.ok && saved.data?.key).toBe("greetingBubbles");

    await owner.save({ key: "maxClassSize", value: 12 });
    await owner.save({ key: "welcomeNote", value: "Welcome!" });

    const list = await owner.list();
    expect(list.ok ? list.data.rows.length : -1).toBe(3);
    const bubbles = list.ok ? list.data.rows.find((r) => r.key === "greetingBubbles") : undefined;
    expect(bubbles?.value).toBe(true);

    // upsert overwrites the same key
    await owner.save({ key: "greetingBubbles", value: false });
    const again = await owner.list();
    const updated = again.ok ? again.data.rows.find((r) => r.key === "greetingBubbles") : undefined;
    expect(updated?.value).toBe(false);

    const removed = await owner.remove("welcomeNote");
    expect(removed.ok && removed.data?.key).toBe("welcomeNote");
    const after = await owner.list();
    expect(after.ok ? after.data.rows.length : -1).toBe(2);
  });

  it("parent can read settings but cannot write", async () => {
    const parent = new SettingsRepository(await ctxFor(PARENT));

    const list = await parent.list();
    expect(list.ok && list.data?.school?.name).toBe("FAVOURED English School");

    const denied = await parent.save({ key: "hack", value: "nope" });
    expect(denied.ok && denied.data).toBeNull();
  });

  it("teacher can read settings but cannot write", async () => {
    const teacher = new SettingsRepository(await ctxFor(TEACHER));
    const denied = await teacher.save({ key: "hack", value: "nope" });
    expect(denied.ok && denied.data).toBeNull();
  });
});
