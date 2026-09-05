/**
 * Integration test for Phase 11 dashboard against the local PostgreSQL harness
 * (skips when unreachable). Proves the role-aware `fsms.dashboard_summary()` RPC
 * is school-scoped and visibility-scoped for all four demo roles.
 */
import { describe, expect, it } from "vitest";
import { Client } from "pg";
import { fetchProfileFor } from "@/lib/auth/local-db";
import { PgAdapter } from "./pg-adapter";
import { DashboardRepository } from "./repos/dashboard";
import type { DbContext } from "./context";

const dbUrl = process.env.LOCAL_DB_URL ?? "postgres://fsms:fsms_dev@127.0.0.1:5432/fsms_v2";

const OWNER = "00000000-0000-0000-0000-000000000201";
const TEACHER = "00000000-0000-0000-0000-000000000202";
const PARENT = "00000000-0000-0000-0000-000000000203";
const STUDENT = "00000000-0000-0000-0000-000000000204";

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

async function summaryFor(sub: string) {
  const profile = await fetchProfileFor(sub);
  if (!profile) throw new Error(`no profile for ${sub}`);
  const ctx: DbContext = { profile, db: new PgAdapter(sub) };
  return new DashboardRepository(ctx).summary();
}

describe.skipIf(!reachable)("dashboard (integration)", () => {
  it("owner sees school-wide counts and today's attendance", async () => {
    const res = await summaryFor(OWNER);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.role).toBe("admin1");
    expect(res.data.counts?.students).toBeGreaterThanOrEqual(3);
    expect(res.data.counts?.classes).toBeGreaterThanOrEqual(1);
    expect(res.data.today).toMatchObject({ present: 0, late: 0, absent: 0 });
    expect(res.data.school?.name).toContain("FAVOURED");
  });

  it("teacher sees their classes and a grading queue", async () => {
    const res = await summaryFor(TEACHER);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.role).toBe("teacher");
    expect(res.data.myClasses.some((c) => c.name === "A2 Kids")).toBe(true);
    expect(typeof res.data.gradingQueue?.to_grade).toBe("number");
  });

  it("parent sees only their linked children", async () => {
    const res = await summaryFor(PARENT);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.role).toBe("parent");
    const names = res.data.myChildren.map((c) => c.name);
    expect(names.length).toBe(2);
    expect(res.data.counts).toBeNull(); // staff-only section hidden from parents
  });

  it("student sees their own progress and no staff sections", async () => {
    const res = await summaryFor(STUDENT);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.role).toBe("student");
    expect(res.data.counts).toBeNull();
    expect(typeof res.data.myProgress?.evidence).toBe("number");
  });
});
