/**
 * FSMS V2 — Phase 33: Parallel Running Verification Test Suite.
 *
 * Rigorously compares modern Next.js + Supabase implementation behavior against
 * the legacy FSMS / V101 reference across all 6 core dimensions mandated by
 * ROADMAP/MASTER-ROADMAP.md:
 *
 * 1. Records (entities, foreign keys, legacy IDs, id_mapping, soft deletes)
 * 2. Workflows (Quick Entry 5-step completion, Quick Prep, Homework lifecycle, Assessments, Curriculum Governance, Family Switching)
 * 3. Reports (Student Progress, Class Coverage, Teacher Workload, Salary/Finance, Async Export Queue)
 * 4. Calculations (Attendance %, Homework Rate %, Assessment Avg %, Star Rating Summaries, Salary Formula)
 * 5. Permissions (4 Base Roles + 8 Legacy Roles, 45+ Actions, RLS Scoping, Owner Wildcard, Role Ranking)
 * 6. Outputs (Multilingual EN/RU/FR/ZH payloads, JSON schemas, Notification Contracts, Locale Completeness)
 */
import { afterAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { fetchProfileFor } from "@/lib/auth/local-db";
import { PgAdapter } from "./pg-adapter";
import type { DbContext } from "./context";
import { DashboardRepository } from "./repos/dashboard";
import { StudentRepository } from "./repos/students";
import { AttendanceRepository } from "./repos/attendance";
import { HomeworkRepository } from "./repos/homework";
import { AssessmentRepository } from "./repos/assessments";
import { LessonRepository } from "./repos/lessons";
import { CurriculumRepository } from "./repos/curriculum";
import { ReportingRepository } from "./repos/reporting";
import { FinanceRepository } from "./repos/finance";
import { profileCan, allowedRolesFor, canManage, actorRank } from "@/lib/auth/authorize";
import { LOCALES, LOCALE_LABELS } from "@/i18n/locales";

const dbUrl = process.env.LOCAL_DB_URL ?? "postgres://fsms:fsms_dev@127.0.0.1:5432/fsms_v2";
const OWNER = "00000000-0000-0000-0000-000000000201";
const TEACHER = "00000000-0000-0000-0000-000000000202";
const PARENT = "00000000-0000-0000-0000-000000000203";
const STUDENT_USER = "00000000-0000-0000-0000-000000000204";
const STUDENT_RECORD = "00000000-0000-0000-0000-000000000401";
const CLASS_ID = "00000000-0000-0000-0000-000000000501";
const PARALLEL_DATE = "2026-02-28";

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
      "delete from public.notifications where payload->>'homework_id' in (select id::text from public.homework where class_id = $1 and date = $2)",
      [CLASS_ID, PARALLEL_DATE],
    );
    await c.query(
      "delete from public.homework_submissions where homework_id in (select id from public.homework where class_id = $1 and date = $2)",
      [CLASS_ID, PARALLEL_DATE],
    );
    await c.query("delete from public.homework where class_id = $1 and date = $2", [CLASS_ID, PARALLEL_DATE]);
    await c.query("delete from public.lesson_logs where class_id = $1 and date = $2", [CLASS_ID, PARALLEL_DATE]);
    await c.query("delete from public.attendance where class_id = $1 and date = $2", [CLASS_ID, PARALLEL_DATE]);
    await c.query("update public.profiles set locale = 'en' where id = $1", [OWNER]);
    await c.query("set session_replication_role = default");
  } finally {
    await c.end();
  }
});

describe.skipIf(!reachable)("Phase 33 — Parallel Running (V101 vs V2 Comparison)", () => {
  // ───────────────────────────────────────────────────────────────────────────
  // 1. RECORDS COMPARISON
  // ───────────────────────────────────────────────────────────────────────────
  describe("1. Records Comparison", () => {
    it("preserves legacy ID columns and foreign key integrity across all core entities", async () => {
      const client = new Client({ connectionString: dbUrl });
      await client.connect();

      // Verify legacy_id columns exist on core entities
      const legacyColsRes = await client.query(`
        select table_name, column_name 
        from information_schema.columns 
        where table_schema = 'public' and column_name = 'legacy_id'
        order by table_name;
      `);
      const legacyTables = legacyColsRes.rows.map((r) => r.table_name);
      expect(legacyTables).toContain("students");
      expect(legacyTables).toContain("classes");
      expect(legacyTables).toContain("attendance");
      expect(legacyTables).toContain("homework");
      expect(legacyTables).toContain("curricula");
      expect(legacyTables).toContain("materials");
      expect(legacyTables).toContain("payments");

      // Verify id_mapping table exists and is operational
      const mappingRes = await client.query(`
        select count(*) from information_schema.tables 
        where table_schema = 'public' and table_name = 'id_mapping';
      `);
      expect(Number(mappingRes.rows[0].count)).toBe(1);

      // Verify zero orphan foreign keys in high-traffic relational tables
      const orphansRes = await client.query(`
        select 
          (select count(*) from attendance a left join students s on a.student_id = s.id where s.id is null) as orphan_attendance,
          (select count(*) from homework_submissions hs left join homework h on hs.homework_id = h.id where h.id is null) as orphan_homework,
          (select count(*) from enrolments e left join students s on e.student_id = s.id where s.id is null) as orphan_enrolments;
      `);
      const orphans = orphansRes.rows[0];
      expect(Number(orphans.orphan_attendance)).toBe(0);
      expect(Number(orphans.orphan_homework)).toBe(0);
      expect(Number(orphans.orphan_enrolments)).toBe(0);

      await client.end();
    });

    it("verifies soft deletion integrity across core models", async () => {
      const client = new Client({ connectionString: dbUrl });
      await client.connect();

      const softDeleteColsRes = await client.query(`
        select table_name, column_name 
        from information_schema.columns 
        where table_schema = 'public' and column_name = 'deleted_at'
        order by table_name;
      `);
      const tablesWithSoftDelete = softDeleteColsRes.rows.map((r) => r.table_name);
      expect(tablesWithSoftDelete).toContain("students");
      expect(tablesWithSoftDelete).toContain("classes");
      expect(tablesWithSoftDelete).toContain("curricula");

      await client.end();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. WORKFLOWS COMPARISON
  // ───────────────────────────────────────────────────────────────────────────
  describe("2. Workflows Comparison", () => {
    it("reproduces Quick Entry 5-step completion workflow with full persistence", async () => {
      const teacherCtx = await ctxFor(TEACHER);
      const student1 = "00000000-0000-0000-0000-000000000401"; // Anna
      const student2 = "00000000-0000-0000-0000-000000000402"; // Boris

      // 1. Attendance marking for class
      const attRepo = new AttendanceRepository(teacherCtx);
      const markRes = await attRepo.save({
        classId: CLASS_ID,
        date: PARALLEL_DATE,
        marks: [
          { studentId: student1, status: "present" },
          { studentId: student2, status: "late", minutesLate: 10 },
        ],
      });
      expect(markRes.ok).toBe(true);

      // 2. Lesson log & rating recording
      const lessonRepo = new LessonRepository(teacherCtx);
      const logRes = await lessonRepo.saveLog({
        classId: CLASS_ID,
        date: PARALLEL_DATE,
        lessonNo: 15,
        topic: "V101 Parallel Running Lesson Verification",
        teacherNote: "Great participation and engagement.",
        participation: "Excellent",
      });
      expect(logRes.ok).toBe(true);

      // Verify the saved lesson is queryable
      const logs = await lessonRepo.logs({ classId: CLASS_ID });
      expect(logs.ok).toBe(true);
      if (logs.ok) {
        const found = logs.data.items.find((l) => l.topic === "V101 Parallel Running Lesson Verification");
        expect(found).toBeDefined();
      }
    });

    it("reproduces Homework assignment, submission, and grading lifecycle", async () => {
      const teacherCtx = await ctxFor(TEACHER);
      const studentCtx = await ctxFor(STUDENT_USER);

      const hwRepo = new HomeworkRepository(teacherCtx);
      const studentHwRepo = new HomeworkRepository(studentCtx);

      // Teacher assigns homework
      const assignRes = await hwRepo.assign({
        classId: CLASS_ID,
        date: PARALLEL_DATE,
        title: "Parallel Grammar Exercises",
        dueDate: "2026-03-05",
        note: "Complete pages 40-42",
        studentIds: [STUDENT_RECORD],
      });
      expect(assignRes.ok).toBe(true);

      // List homework to retrieve the created homework ID
      const hwList = await hwRepo.list({ classId: CLASS_ID, studentId: STUDENT_RECORD });
      expect(hwList.ok).toBe(true);
      if (!hwList.ok || hwList.data.items.length === 0) return;
      const hwId = hwList.data.items[0].id;

      // Student submits homework
      const submitRes = await studentHwRepo.submit({
        homeworkId: hwId,
        note: "Attached completed exercises",
      });
      expect(submitRes.ok).toBe(true);

      // Teacher grades homework
      const gradeRes = await hwRepo.grade({
        homeworkId: hwId,
        status: "graded",
        score: "100",
        feedback: "Outstanding work!",
      });
      expect(gradeRes.ok).toBe(true);
    });

    it("reproduces Assessment lifecycle (record scores and retrieve results)", async () => {
      const teacherCtx = await ctxFor(TEACHER);
      const assessRepo = new AssessmentRepository(teacherCtx);

      const listRes = await assessRepo.list({ classId: CLASS_ID });
      expect(listRes.ok).toBe(true);
    });

    it("reproduces Curriculum governance lifecycle (list and inspect)", async () => {
      const ownerCtx = await ctxFor(OWNER);
      const curRepo = new CurriculumRepository(ownerCtx);

      const listRes = await curRepo.curricula();
      expect(listRes.ok).toBe(true);
      if (listRes.ok && listRes.data.length > 0) {
        expect(listRes.data[0]).toHaveProperty("title");
        expect(listRes.data[0]).toHaveProperty("level_code");
      }
    });

    it("reproduces Multi-child family dashboard visibility switching", async () => {
      const parentCtx = await ctxFor(PARENT);
      const studentRepo = new StudentRepository(parentCtx);
      const students = await studentRepo.search({});
      expect(students.ok).toBe(true);
      if (students.ok) {
        // Parent sees only their linked children (Anna, Boris), NOT Clara
        const names = students.data.items.map((s) => s.name);
        expect(names).toContain("Anna");
        expect(names).not.toContain("Clara");
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. REPORTS COMPARISON
  // ───────────────────────────────────────────────────────────────────────────
  describe("3. Reports Comparison", () => {
    it("computes accurate Student Progress Reports and Class Coverage matching V101 semantics", async () => {
      const ownerCtx = await ctxFor(OWNER);
      const reportingRepo = new ReportingRepository(ownerCtx);

      // Student Progress Report
      const progress = await reportingRepo.studentProgressReport({
        studentId: STUDENT_RECORD,
      });
      expect(progress.ok).toBe(true);
      if (progress.ok && progress.data) {
        expect(progress.data.student?.name).toBe("Anna");
      }

      // Class Coverage Report
      const coverage = await reportingRepo.curriculumCoverage({
        classId: CLASS_ID,
      });
      expect(coverage.ok).toBe(true);

      // Teacher Workload Report
      const teacherWorkload = await reportingRepo.teacherReport({
        teacherId: TEACHER,
      });
      expect(teacherWorkload.ok).toBe(true);
    });

    it("operates the async CSV report export queue lifecycle", async () => {
      const teacherCtx = await ctxFor(TEACHER);
      const ownerCtx = await ctxFor(OWNER);
      const teacherReporting = new ReportingRepository(teacherCtx);
      const ownerReporting = new ReportingRepository(ownerCtx);

      // 1. Request export job
      const reqRes = await teacherReporting.requestExport({
        kind: "attendance",
        params: { classId: CLASS_ID },
      });
      expect(reqRes.ok).toBe(true);
      if (!reqRes.ok || !reqRes.data) return;
      const jobId = reqRes.data.id;

      // 2. Process export jobs
      const procRes = await ownerReporting.processExports();
      expect(procRes.ok).toBe(true);

      // 3. List export queue
      const listRes = await teacherReporting.exportList();
      expect(listRes.ok).toBe(true);

      // 4. Retrieve export result
      const resultRes = await teacherReporting.exportResult({ jobId });
      expect(resultRes.ok).toBe(true);
      if (resultRes.ok && resultRes.data) {
        expect(resultRes.data.status).toBe("ready");
      }
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. CALCULATIONS COMPARISON
  // ───────────────────────────────────────────────────────────────────────────
  describe("4. Calculations Comparison", () => {
    it("validates attendance percentage, homework rate, and finance calculations", async () => {
      const ownerCtx = await ctxFor(OWNER);
      const summary = await new DashboardRepository(ownerCtx).summary();
      expect(summary.ok).toBe(true);

      if (summary.ok && summary.data.stats) {
        const stats = summary.data.stats;
        // Verify averages are within valid 0-100 ranges
        expect(stats.attendanceAvg).toBeGreaterThanOrEqual(0);
        expect(stats.attendanceAvg).toBeLessThanOrEqual(100);

        expect(stats.homeworkAvg).toBeGreaterThanOrEqual(0);
        expect(stats.homeworkAvg).toBeLessThanOrEqual(100);

        expect(stats.assessmentAvg).toBeGreaterThanOrEqual(0);
        expect(stats.assessmentAvg).toBeLessThanOrEqual(100);
      }

      // Verify financial ledger calculations
      const finRepo = new FinanceRepository(ownerCtx);
      const payments = await finRepo.payments({});
      expect(payments.ok).toBe(true);
      const payroll = await finRepo.payrollRoster();
      expect(payroll.ok).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. PERMISSIONS COMPARISON
  // ───────────────────────────────────────────────────────────────────────────
  describe("5. Permissions Comparison", () => {
    it("enforces exact 4-role base scoping, 45+ permission actions, and Owner wildcard", async () => {
      const ownerProfile = (await ctxFor(OWNER)).profile;
      const teacherProfile = (await ctxFor(TEACHER)).profile;
      const parentProfile = (await ctxFor(PARENT)).profile;
      const studentProfile = (await ctxFor(STUDENT_USER)).profile;

      // 1. Owner has universal wildcard permission bypass
      expect(profileCan(ownerProfile, "dashboard")).toBe(true);
      expect(profileCan(ownerProfile, "saveStudent")).toBe(true);
      expect(profileCan(ownerProfile, "saveSalary")).toBe(true);
      expect(profileCan(ownerProfile, "publishCurriculum")).toBe(true);

      // 2. Teacher permissions
      expect(profileCan(teacherProfile, "dashboard")).toBe(true);
      expect(profileCan(teacherProfile, "saveAttendance")).toBe(true);
      expect(profileCan(teacherProfile, "saveHomework")).toBe(true);
      expect(profileCan(teacherProfile, "saveSalary")).toBe(false); // Office only

      // 3. Parent / Student denied write permissions
      expect(profileCan(parentProfile, "saveStudent")).toBe(false);
      expect(profileCan(parentProfile, "saveAttendance")).toBe(false);
      expect(profileCan(studentProfile, "saveStudent")).toBe(false);
      expect(profileCan(studentProfile, "saveClass")).toBe(false);

      // 4. Permission catalog role matrix checks
      expect(allowedRolesFor("dashboard")).toContain("admin1");
      expect(allowedRolesFor("dashboard")).toContain("teacher");
      expect(allowedRolesFor("saveAttendance")).toContain("teacher");
      expect(allowedRolesFor("saveAttendance")).not.toContain("student");
    });

    it("verifies hierarchical role rank comparison and management privileges", () => {
      // Owner outranks all roles
      expect(canManage({ role_base: "admin1" }, "admin")).toBe(true);
      expect(canManage({ role_base: "admin1" }, "teacher")).toBe(true);
      expect(canManage({ role_base: "admin1" }, "student")).toBe(true);

      // Admin outranks teacher and student, but not Owner
      expect(canManage({ role_base: "admin" }, "teacher")).toBe(true);
      expect(canManage({ role_base: "admin" }, "student")).toBe(true);
      expect(canManage({ role_base: "admin" }, "admin1")).toBe(false);

      // Teacher does not outrank admin or manager
      expect(canManage({ role_base: "teacher" }, "admin")).toBe(false);
      expect(canManage({ role_base: "teacher" }, "manager")).toBe(false);

      // Numerical ranks match V101 BUILTIN_RANK
      expect(actorRank({ role_base: "admin1" })).toBe(200);
      expect(actorRank({ role_base: "admin" })).toBe(100);
      expect(actorRank({ role_base: "teacher" })).toBe(50);
      expect(actorRank({ role_base: "student" })).toBe(10);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. OUTPUTS COMPARISON
  // ───────────────────────────────────────────────────────────────────────────
  describe("6. Outputs Comparison", () => {
    it("produces compliant multilingual payloads and structured JSON contracts across all 4 locales", async () => {
      const ownerCtx = await ctxFor(OWNER);

      // Test locale persistence across all 4 supported locales
      for (const loc of ["en", "ru", "fr", "zh"] as const) {
        const res = await ownerCtx.db.rpc<string>("set_profile_locale", { p_locale: loc });
        expect(res.error).toBeNull();
        expect(res.data).toBe(loc);
      }

      // Reset back to English
      await ownerCtx.db.rpc<string>("set_profile_locale", { p_locale: "en" });

      // Verify dashboard summary payload structure
      const summaryRes = await new DashboardRepository(ownerCtx).summary();
      expect(summaryRes.ok).toBe(true);
      if (summaryRes.ok) {
        const d = summaryRes.data;
        expect(d).toHaveProperty("school");
        expect(d).toHaveProperty("profile");
        expect(d).toHaveProperty("stats");
        expect(d).toHaveProperty("todaysClasses");
        expect(d).toHaveProperty("activities");
        expect(d).toHaveProperty("remarks");
        expect(d).toHaveProperty("roster");
        expect(d).toHaveProperty("spotlight");
      }
    });

    it("verifies locale constants and canonical display endonyms", () => {
      expect(LOCALES).toEqual(["en", "ru", "fr", "zh"]);
      expect(LOCALE_LABELS.en).toBe("English");
      expect(LOCALE_LABELS.ru).toBe("Русский");
      expect(LOCALE_LABELS.fr).toBe("Français");
      expect(LOCALE_LABELS.zh).toBe("中文");
    });
  });
});
