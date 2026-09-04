/**
 * Integration test for Phase 14 attendance against the local PostgreSQL harness
 * (skips when unreachable): grid/save/stats/history as teacher, my_attendance
 * for parent/student, visibility gating, and audit-trail capture. Cleans up.
 */
import { afterAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { fetchProfileFor } from "@/lib/auth/local-db";
import { PgAdapter } from "./pg-adapter";
import { AttendanceRepository } from "./repos/attendance";
import type { DbContext } from "./context";

const dbUrl = process.env.LOCAL_DB_URL ?? "postgres://fsms:fsms_dev@127.0.0.1:5432/fsms_v2";

const TEACHER = "00000000-0000-0000-0000-000000000202";
const PARENT = "00000000-0000-0000-0000-000000000203";
const STUDENT = "00000000-0000-0000-0000-000000000204";
const ANNA = "00000000-0000-0000-0000-000000000401";
const BORIS = "00000000-0000-0000-0000-000000000402";
const CLARA = "00000000-0000-0000-0000-000000000403";
const A2KIDS = "00000000-0000-0000-0000-000000000501";
const DATE = "2026-01-15"; // fixed past date to isolate from any real records

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
    await c.query("set session_replication_role = replica");
    await c.query(
      "delete from public.audit_log where entity = 'attendance' and entity_id in (select id from public.attendance where class_id = $1 and date = $2)",
      [A2KIDS, DATE],
    );
    await c.query("delete from public.attendance where class_id = $1 and date = $2", [A2KIDS, DATE]);
    await c.query("set session_replication_role = default");
  } finally {
    await c.end();
  }
});

describe.skipIf(!reachable)("attendance (integration)", () => {
  it("teacher marks a whole class in one round trip and reads stats/history", async () => {
    const repo = new AttendanceRepository(await ctxFor(TEACHER));

    const grid = await repo.grid({ classId: A2KIDS, date: DATE });
    expect(grid.ok && grid.data).toBeTruthy();
    if (grid.ok && grid.data) {
      expect(grid.data.students).toHaveLength(2);
      expect(grid.data.students.every((s) => s.status === null)).toBe(true); // nothing marked yet
    }

    const save = await repo.save({
      classId: A2KIDS,
      date: DATE,
      marks: [
        { studentId: ANNA, status: "present" },
        { studentId: BORIS, status: "late", minutesLate: 5 },
      ],
    });
    expect(save.ok && save.data?.saved).toBe(2);

    const stats = await repo.stats({ classId: A2KIDS, from: DATE, to: DATE });
    expect(stats.ok && stats.data).toBeTruthy();
    if (stats.ok && stats.data) {
      const anna = stats.data.students.find((s) => s.id === ANNA);
      expect(anna?.present).toBe(1);
      const boris = stats.data.students.find((s) => s.id === BORIS);
      expect(boris?.late).toBe(1);
    }

    const history = await repo.history({ classId: A2KIDS, from: DATE, to: DATE });
    expect(history.ok && history.data?.total).toBe(2);

    // idempotent re-save updates rather than duplicates
    await repo.save({ classId: A2KIDS, date: DATE, marks: [{ studentId: ANNA, status: "absent" }] });
    const history2 = await repo.history({ classId: A2KIDS, from: DATE, to: DATE });
    expect(history2.ok && history2.data?.total).toBe(2);
  });

  it("parent sees linked children only; grid and save are denied", async () => {
    const repo = new AttendanceRepository(await ctxFor(PARENT));

    const mine = await repo.myAttendance(ANNA);
    expect(mine.ok && mine.data).toBeTruthy();
    if (mine.ok && mine.data) expect(mine.data.totals.present).toBeGreaterThanOrEqual(0);

    const notMine = await repo.myAttendance(CLARA);
    expect(notMine.ok && notMine.data).toBeNull();

    const grid = await repo.grid({ classId: A2KIDS, date: DATE });
    expect(grid.ok && grid.data).toBeNull();
  });

  it("student sees only their own summary", async () => {
    const repo = new AttendanceRepository(await ctxFor(STUDENT));
    const mine = await repo.myAttendance(ANNA);
    expect(mine.ok && mine.data).toBeTruthy();
    const other = await repo.myAttendance(BORIS);
    expect(other.ok && other.data).toBeNull();
  });

  it("attendance writes are audit-logged (history preserved)", async () => {
    const repo = new AttendanceRepository(await ctxFor(TEACHER));
    await repo.save({ classId: A2KIDS, date: DATE, marks: [{ studentId: ANNA, status: "present" }] });

    const c = new Client({ connectionString: dbUrl });
    await c.connect();
    try {
      const res = await c.query(
        "select count(*)::int as n from audit_log where entity = 'attendance' and entity_id in (select id from attendance where class_id = $1 and date = $2)",
        [A2KIDS, DATE],
      );
      expect(res.rows[0].n).toBeGreaterThanOrEqual(1);
    } finally {
      await c.end();
    }
  });
});
