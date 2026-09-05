/**
 * Phase 29 — four-role workflow smoke (integration, service → database).
 *
 * Exercises the primary read surface for each of the four seeded personas
 * (administrator, teacher, parent, student) and asserts that RBAC forbids
 * writes outside a role. Complements the per-domain integration suites; runs
 * against the local PostgreSQL harness and skips when unreachable.
 */
import { describe, expect, it } from "vitest";
import { Client } from "pg";
import { fetchProfileFor } from "@/lib/auth/local-db";
import { PgAdapter } from "./pg-adapter";
import type { DbContext } from "./context";
import { DashboardRepository } from "./repos/dashboard";
import { UserRepository } from "./repos/users";
import { ClassRepository } from "./repos/classes";
import { StudentRepository } from "./repos/students";
import { AttendanceRepository } from "./repos/attendance";
import { HomeworkRepository } from "./repos/homework";

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

async function ctxFor(sub: string): Promise<DbContext> {
  const profile = await fetchProfileFor(sub);
  if (!profile) throw new Error(`no profile for ${sub}`);
  return { profile, db: new PgAdapter(sub) };
}

describe.skipIf(!reachable)("four-role workflows (integration)", () => {
  it("administrator: dashboard summary + user directory", async () => {
    const dash = await new DashboardRepository(await ctxFor(OWNER)).summary();
    expect(dash.ok).toBe(true);

    const users = await new UserRepository(await ctxFor(OWNER)).search({});
    expect(users.ok).toBe(true);
    if (users.ok) expect(users.data.items.length).toBeGreaterThan(0);
  });

  it("teacher: class list + attendance grid for an assigned class", async () => {
    const classes = await new ClassRepository(await ctxFor(TEACHER)).search({});
    expect(classes.ok).toBe(true);
    if (classes.ok && classes.data.items.length > 0) {
      const grid = await new AttendanceRepository(await ctxFor(TEACHER)).grid({
        classId: classes.data.items[0].id,
        date: "2026-01-15",
      });
      expect(grid.ok).toBe(true);
    }
  });

  it("parent: homework list resolves through visibility scoping", async () => {
    const hw = await new HomeworkRepository(await ctxFor(PARENT)).list({});
    expect(hw.ok).toBe(true);
  });

  it("student: own attendance + homework list", async () => {
    const me = await new StudentRepository(await ctxFor(STUDENT)).search({});
    expect(me.ok).toBe(true);
    if (!me.ok || me.data.items.length === 0) return;
    const myId = me.data.items[0].id;

    const att = await new AttendanceRepository(await ctxFor(STUDENT)).myAttendance(myId);
    expect(att.ok).toBe(true);

    const hw = await new HomeworkRepository(await ctxFor(STUDENT)).list({});
    expect(hw.ok).toBe(true);
  });

  it("RBAC forbids student creation outside office roles", async () => {
    for (const sub of [TEACHER, PARENT, STUDENT]) {
      const res = await new StudentRepository(await ctxFor(sub)).create({ name: "Nope" });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.error.code).toBe("forbidden");
    }
  });
});
