/**
 * Integration test for Phase 21 AI against the local PostgreSQL harness
 * (skips when unreachable): provider registry (defaults, custom save/delete/
 * reorder, SUPERUSER gating) and usage logging/totals/list with role scoping.
 * No model calls happen here — the engine is unit-tested separately.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { fetchProfileFor } from "@/lib/auth/local-db";
import { PgAdapter } from "./pg-adapter";
import { AiRepository } from "./repos/ai";
import type { DbContext } from "./context";

const dbUrl = process.env.LOCAL_DB_URL ?? "postgres://fsms:fsms_dev@127.0.0.1:5432/fsms_v2";

const SCHOOL = "00000000-0000-0000-0000-000000000001";
const OWNER = "00000000-0000-0000-0000-000000000201";
const TEACHER = "00000000-0000-0000-0000-000000000202";
const PARENT = "00000000-0000-0000-0000-000000000203";

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

const cleanup = `
  delete from public.ai_usage_logs where school_id = '${SCHOOL}';
  delete from public.ai_providers where school_id = '${SCHOOL}' and is_custom;
`;

describe.skipIf(!reachable)("ai (integration)", () => {
  beforeAll(async () => {
    await exec(cleanup);
  });
  afterAll(async () => {
    await exec(cleanup);
  });

  it("provider list ensures defaults and is SUPERUSER-only", async () => {
    const owner = new AiRepository(await ctxFor(OWNER));
    const list = await owner.providerList();
    expect(list.ok).toBe(true);
    if (list.ok) {
      expect(list.data.length).toBe(3);
      expect(list.data.map((p) => p.key_slug).sort()).toEqual(["gemini", "groq", "openrouter"]);
    }
    const teacher = await new AiRepository(await ctxFor(TEACHER)).providerList();
    expect(teacher.ok).toBe(false);
    if (!teacher.ok) expect(teacher.error.code).toBe("forbidden");
  });

  it("custom provider lifecycle: save → reorder → delete (custom only)", async () => {
    const repo = new AiRepository(await ctxFor(OWNER));

    const saved = await repo.saveProvider({
      keySlug: "it-custom",
      label: "IT Custom",
      kind: "openai",
      baseUrl: "https://it.example/v1",
      model: "it-model",
      enabled: true,
      sortOrder: 9,
    });
    expect(saved.ok && saved.data?.id).toBeTruthy();
    const id = saved.ok ? saved.data!.id : null;

    const reorder = await repo.orderProviders({
      order: [{ keySlug: "gemini" }, { keySlug: "groq" }, { keySlug: "openrouter" }, { keySlug: "it-custom" }],
    });
    expect(reorder.ok && reorder.data?.updated).toBeGreaterThanOrEqual(3);

    const del = await repo.deleteProvider({ providerId: id! });
    expect(del.ok && del.data?.key_slug).toBe("it-custom");

    // built-ins cannot be deleted
    const list = await repo.providerList();
    const builtin = list.ok ? list.data[0] : null;
    const delBuiltin = await repo.deleteProvider({ providerId: builtin!.id });
    expect(delBuiltin.ok && delBuiltin.data).toBeNull();
  });

  it("usage logging + totals are scoped by role", async () => {
    const teacher = new AiRepository(await ctxFor(TEACHER));
    const logged = await teacher.logUsage({
      action: "aiAsk",
      provider: "gemini",
      model: "gemini-2.0-flash",
      promptTokens: 100,
      completionTokens: 50,
      cost: 0.0001,
      status: "ok",
      latencyMs: 500,
    });
    expect(logged.ok && logged.data?.status).toBe("ok");

    // parent cannot write usage (RBAC pre-check rejects non-staff)
    const parentWrite = await new AiRepository(await ctxFor(PARENT)).logUsage({ action: "aiAsk" });
    expect(parentWrite.ok).toBe(false);
    if (!parentWrite.ok) expect(parentWrite.error.code).toBe("forbidden");

    // teacher sees own totals (1 call)
    const own = await teacher.usageTotals({});
    expect(own.ok && own.data?.calls).toBe(1);

    // owner (leadership) sees school totals
    const all = await new AiRepository(await ctxFor(OWNER)).usageTotals({});
    expect(all.ok && (all.data?.calls ?? 0)).toBeGreaterThanOrEqual(1);

    // teacher cannot read the school usage list; owner can
    const teacherList = await teacher.usageList({ pageSize: 10 });
    expect(teacherList.ok && teacherList.data).toBeNull();
    const ownerList = await new AiRepository(await ctxFor(OWNER)).usageList({ pageSize: 10 });
    expect(ownerList.ok && ownerList.data?.rows.length).toBeGreaterThanOrEqual(1);
  });

  it("status is available to all roles", async () => {
    const res = await new AiRepository(await ctxFor(PARENT)).status();
    expect(res.ok && res.data?.providers.length).toBe(3);
  });
});
