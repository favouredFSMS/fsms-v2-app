/**
 * Integration test for Phase 20 reporting against the local PostgreSQL harness
 * (skips when unreachable): student progress (teacher/parent/student scoping),
 * learner overview, attendance + assessment reports, class report, teacher
 * report, curriculum coverage/analytics, class earnings, salary history and the
 * async export queue (request → deny → process → result/list). Cleans up.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { fetchProfileFor } from "@/lib/auth/local-db";
import { PgAdapter } from "./pg-adapter";
import { ReportingRepository } from "./repos/reporting";
import type { DbContext } from "./context";

const dbUrl = process.env.LOCAL_DB_URL ?? "postgres://fsms:fsms_dev@127.0.0.1:5432/fsms_v2";

const SCHOOL = "00000000-0000-0000-0000-000000000001";
const OWNER = "00000000-0000-0000-0000-000000000201";
const TEACHER = "00000000-0000-0000-0000-000000000202";
const PARENT = "00000000-0000-0000-0000-000000000203";
const STUDENT = "00000000-0000-0000-0000-000000000204";
const CLS = "00000000-0000-0000-0000-000000000501";
const ANNA = "00000000-0000-0000-0000-000000000401";
const BORIS = "00000000-0000-0000-0000-000000000402";
const CLARA = "00000000-0000-0000-0000-000000000403";

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
  delete from public.report_exports where school_id = '${SCHOOL}';
  delete from public.attendance where school_id = '${SCHOOL}' and date in ('2026-06-15','2026-06-16') and class_id = '${CLS}';
  delete from public.assessments where school_id = '${SCHOOL}' and date in ('2026-06-15','2026-06-16') and class_id = '${CLS}';
  delete from public.payment_ledger where school_id = '${SCHOOL}' and lesson_key in ('PH20-A','PH20-B');
  delete from public.salaries where school_id = '${SCHOOL}' and user_id = '${TEACHER}' and month in ('2026-06','2026-07');
  delete from public.lesson_logs where school_id = '${SCHOOL}' and class_id = '${CLS}' and date in ('2026-06-15','2026-06-16');
`;

const fixtures = `
  insert into public.attendance (school_id, date, class_id, student_id, status) values
    ('${SCHOOL}','2026-06-15','${CLS}','${ANNA}','present'),
    ('${SCHOOL}','2026-06-15','${CLS}','${BORIS}','late'),
    ('${SCHOOL}','2026-06-16','${CLS}','${ANNA}','present'),
    ('${SCHOOL}','2026-06-16','${CLS}','${BORIS}','absent');
  insert into public.assessments (school_id, date, class_id, student_id, type, title, score, max_score, recorded_by) values
    ('${SCHOOL}','2026-06-15','${CLS}','${ANNA}','Quiz','Q1',80,100,'${TEACHER}'),
    ('${SCHOOL}','2026-06-16','${CLS}','${ANNA}','Test','T1',90,100,'${TEACHER}'),
    ('${SCHOOL}','2026-06-16','${CLS}','${BORIS}','Quiz','Q1',60,100,'${TEACHER}');
  insert into public.payment_ledger (school_id, student_id, class_id, lesson_key, amount, kind, status) values
    ('${SCHOOL}','${ANNA}','${CLS}','PH20-A',900,'lesson','confirmed'),
    ('${SCHOOL}','${ANNA}','${CLS}','PH20-B',900,'lesson','pending');
  insert into public.salaries (school_id, user_id, month, amount, currency, status) values
    ('${SCHOOL}','${TEACHER}','2026-06',50000,'RUB','paid'),
    ('${SCHOOL}','${TEACHER}','2026-07',50000,'RUB','pending');
  insert into public.lesson_logs (school_id, date, class_id, lesson_no, topic, created_by) values
    ('${SCHOOL}','2026-06-15','${CLS}',1,'Greetings','${TEACHER}'),
    ('${SCHOOL}','2026-06-16','${CLS}',2,'Family','${TEACHER}');
`;

describe.skipIf(!reachable)("reporting (integration)", () => {
  beforeAll(async () => {
    await exec(cleanup);
    await exec(fixtures);
  });

  afterAll(async () => {
    await exec(cleanup);
  });

  it("studentProgressReport: teacher sees full report", async () => {
    const res = await new ReportingRepository(await ctxFor(TEACHER)).studentProgressReport({ studentId: ANNA });
    expect(res.ok && res.data).toBeTruthy();
    if (res.ok && res.data) {
      expect(res.data.student?.id).toBe(ANNA);
      expect(res.data.attendance?.present).toBeGreaterThanOrEqual(2);
      expect(res.data.assessments?.count).toBeGreaterThanOrEqual(2);
      expect(res.data.balance?.collected).toBe(900);
    }
  });

  it("parent sees own child, denied other child", async () => {
    const repo = new ReportingRepository(await ctxFor(PARENT));
    const own = await repo.studentProgressReport({ studentId: ANNA });
    expect(own.ok && own.data?.student?.id).toBe(ANNA);
    const other = await repo.studentProgressReport({ studentId: CLARA });
    expect(other.ok && other.data).toBeNull();
  });

  it("student sees own report, denied other", async () => {
    const repo = new ReportingRepository(await ctxFor(STUDENT));
    const own = await repo.studentProgressReport({ studentId: ANNA });
    expect(own.ok && own.data?.student?.id).toBe(ANNA);
    const other = await repo.studentProgressReport({ studentId: BORIS });
    expect(other.ok && other.data).toBeNull();
  });

  it("learnerProgressOverview lists enrolled students", async () => {
    const res = await new ReportingRepository(await ctxFor(TEACHER)).learnerProgressOverview({ classId: CLS });
    expect(res.ok && res.data).toBeTruthy();
    if (res.ok && res.data) expect(res.data.students.length).toBe(2);
  });

  it("attendanceReport + assessmentReport aggregate per student", async () => {
    const repo = new ReportingRepository(await ctxFor(TEACHER));
    const att = await repo.attendanceReport({ classId: CLS });
    expect(att.ok && att.data?.students.length).toBe(2);
    const asm = await repo.assessmentReport({ classId: CLS });
    expect(asm.ok && asm.data?.students.length).toBe(2);
  });

  it("classReport is visible to a parent", async () => {
    const res = await new ReportingRepository(await ctxFor(PARENT)).classReport({ classId: CLS });
    expect(res.ok && res.data?.class?.name).toBe("A2 Kids");
  });

  it("teacherReport shows own workload; parent denied", async () => {
    const own = await new ReportingRepository(await ctxFor(TEACHER)).teacherReport({});
    expect(own.ok && own.data?.teacher?.id).toBe(TEACHER);
    if (own.ok && own.data) expect(own.data.classes.length).toBeGreaterThanOrEqual(1);
    const parent = await new ReportingRepository(await ctxFor(PARENT)).teacherReport({});
    expect(parent.ok && parent.data).toBeNull();
  });

  it("curriculumCoverage: office sees taught lessons, teacher denied", async () => {
    const owner = await new ReportingRepository(await ctxFor(OWNER)).curriculumCoverage({ classId: CLS });
    expect(owner.ok && owner.data?.taught_count).toBeGreaterThanOrEqual(2);
    const teacher = await new ReportingRepository(await ctxFor(TEACHER)).curriculumCoverage({ classId: CLS });
    expect(teacher.ok).toBe(false);
    if (!teacher.ok) expect(teacher.error.code).toBe("forbidden");
  });

  it("curriculumAnalytics + classEarnings + salaryHistory", async () => {
    const analytics = await new ReportingRepository(await ctxFor(OWNER)).curriculumAnalytics({});
    expect(analytics.ok && analytics.data?.programmes).toBeGreaterThanOrEqual(1);

    const earnings = await new ReportingRepository(await ctxFor(OWNER)).classEarnings({});
    expect(earnings.ok && earnings.data?.rows.length).toBeGreaterThanOrEqual(1);

    const salary = await new ReportingRepository(await ctxFor(TEACHER)).salaryHistory({});
    expect(salary.ok && (salary.data?.total ?? 0)).toBeGreaterThanOrEqual(100000);
  });

  it("export queue: request → process → result → list, with role denial", async () => {
    const teacher = new ReportingRepository(await ctxFor(TEACHER));

    const denied = await new ReportingRepository(await ctxFor(STUDENT)).requestExport({ kind: "attendance", params: {} });
    expect(denied.ok && denied.data).toBeNull();

    const req = await teacher.requestExport({ kind: "attendance", params: { classId: CLS } });
    expect(req.ok && req.data?.id).toBeTruthy();
    const jobId = req.ok ? req.data!.id : null;

    const processDenied = await teacher.processExports();
    expect(processDenied.ok && processDenied.data).toBeNull();

    const processed = await new ReportingRepository(await ctxFor(OWNER)).processExports();
    expect(processed.ok && (processed.data?.processed ?? 0)).toBeGreaterThanOrEqual(1);

    const result = await teacher.exportResult({ jobId: jobId! });
    expect(result.ok && result.data?.status).toBe("ready");
    if (result.ok && result.data) expect(result.data.payload?.length).toBeGreaterThan(0);

    const list = await teacher.exportList();
    expect(list.ok && list.data?.rows.length).toBeGreaterThanOrEqual(1);
  });
});
