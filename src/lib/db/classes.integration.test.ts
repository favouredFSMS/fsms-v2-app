/**
 * Integration test for Phase 13 academic structure against the local PostgreSQL
 * harness (skips when unreachable): class_search / class_detail visibility,
 * academic_structure staff gating, and the office write flow (year → term →
 * subject → class → teacher assignment → enrolment → status), with cleanup.
 */
import { afterAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { fetchProfileFor } from "@/lib/auth/local-db";
import { PgAdapter } from "./pg-adapter";
import { ClassRepository } from "./repos/classes";
import { AcademicRepository } from "./repos/academic";
import type { DbContext } from "./context";

const dbUrl = process.env.LOCAL_DB_URL ?? "postgres://fsms:fsms_dev@127.0.0.1:5432/fsms_v2";

const OWNER = "00000000-0000-0000-0000-000000000201";
const TEACHER = "00000000-0000-0000-0000-000000000202";
const PARENT = "00000000-0000-0000-0000-000000000203";
const STUDENT = "00000000-0000-0000-0000-000000000204";
const CLARA = "00000000-0000-0000-0000-000000000403";
const A2KIDS = "00000000-0000-0000-0000-000000000501";

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

// Cleanup: remove everything the write-flow test creates (FK-safe order,
// triggers disabled via replica role). Collect ids to delete after the run.
const created: { classId?: string; termId?: string; subjectId?: string; yearId?: string } = {};

afterAll(async () => {
  if (!reachable) return;
  const c = new Client({ connectionString: dbUrl });
  await c.connect();
  try {
    await c.query("set session_replication_role = replica");
    if (created.classId) {
      await c.query("delete from public.audit_log where entity = 'classes' and entity_id = $1", [created.classId]);
      await c.query("delete from public.class_teachers where class_id = $1", [created.classId]);
      await c.query("delete from public.enrolments where class_id = $1", [created.classId]);
      await c.query("delete from public.classes where id = $1", [created.classId]);
    }
    if (created.subjectId) await c.query("delete from public.subjects where id = $1", [created.subjectId]);
    if (created.termId) await c.query("delete from public.terms where id = $1", [created.termId]);
    if (created.yearId) await c.query("delete from public.academic_years where id = $1", [created.yearId]);
    await c.query("set session_replication_role = default");
  } finally {
    await c.end();
  }
});

describe.skipIf(!reachable)("academic structure (integration)", () => {
  it("teacher sees classes and the full roster", async () => {
    const repo = new ClassRepository(await ctxFor(TEACHER));
    const list = await repo.search({});
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.data.total).toBe(1);
    expect(list.data.items[0].name).toBe("A2 Kids");

    const detail = await repo.detail(A2KIDS);
    expect(detail.ok && detail.data).toBeTruthy();
    if (detail.ok && detail.data) {
      expect(detail.data.students).toHaveLength(2);
      expect(detail.data.teachers[0].is_primary).toBe(true);
      expect(detail.data.day_times).toHaveLength(2);
    }
  });

  it("parent sees their own class but not the school structure", async () => {
    const repo = new ClassRepository(await ctxFor(PARENT));
    const list = await repo.search({});
    expect(list.ok && list.data?.total).toBe(1);

    const detail = await repo.detail(A2KIDS);
    expect(detail.ok && detail.data).toBeTruthy();
    if (detail.ok && detail.data) expect(detail.data.students).toHaveLength(2); // their two children

    const struct = await new AcademicRepository(await ctxFor(PARENT)).structure();
    expect(struct.ok && struct.data).toBeNull(); // non-staff gated
  });

  it("student sees their own class with only themselves in the roster", async () => {
    const repo = new ClassRepository(await ctxFor(STUDENT));
    const detail = await repo.detail(A2KIDS);
    expect(detail.ok && detail.data).toBeTruthy();
    if (detail.ok && detail.data) expect(detail.data.students).toHaveLength(1);
  });

  it("owner can create year → term → subject → class and assign/enrol", async () => {
    const ctx = await ctxFor(OWNER);
    const classes = new ClassRepository(ctx);
    const academic = new AcademicRepository(ctx);
    const suffix = `-${Date.now()}`;

    const year = await academic.createYear({ name: `Test ${suffix}`, startsOn: "2026-09-01", endsOn: "2027-06-30" });
    expect(year.ok && year.data).toBeTruthy();
    if (year.ok && year.data) {
      created.yearId = year.data.id;
      const term = await academic.createTerm({ academicYearId: year.data.id, name: `Term ${suffix}` });
      expect(term.ok && term.data).toBeTruthy();
      if (term.ok && term.data) created.termId = term.data.id;
    }

    const subject = await academic.createSubject({ name: `Physics ${suffix}` });
    expect(subject.ok && subject.data).toBeTruthy();
    if (subject.ok && subject.data) created.subjectId = subject.data.id;

    const cls = await classes.create({
      name: `Test Class ${suffix}`,
      levelCode: "b1",
      learnerType: "teenagers",
      room: "T-9",
    });
    expect(cls.ok && cls.data).toBeTruthy();
    if (!cls.ok || !cls.data) return;
    created.classId = cls.data.id;

    const assign = await classes.assignTeacher({ classId: cls.data.id, userId: TEACHER, primary: true });
    expect(assign.ok && assign.data?.is_primary).toBe(true);

    const enrol = await classes.enrolStudent({ studentId: CLARA, classId: cls.data.id });
    expect(enrol.ok && enrol.data).toBeTruthy();
    if (enrol.ok && enrol.data) {
      const status = await classes.setEnrolmentStatus({ enrolmentId: enrol.data.id, status: "inactive" });
      expect(status.ok && status.data?.status).toBe("inactive");
    }

    // The freshly created class is now visible to the owner.
    const detail = await classes.detail(cls.data.id);
    expect(detail.ok && detail.data).toBeTruthy();
    if (detail.ok && detail.data) {
      expect(detail.data.teachers.some((t) => t.id === TEACHER)).toBe(true);
      expect(detail.data.students.some((s) => s.id === CLARA)).toBe(true);
    }
  });
});
