import { Repository } from "../repository";
import { parseOrFail } from "../validate";
import { fail, ok, type ServiceResult } from "../errors";
import {
  studentProgressReportSchema,
  learnerProgressOverviewSchema,
  classPeriodSchema,
  classReportSchema,
  teacherReportSchema,
  curriculumCoverageSchema,
  curriculumAnalyticsSchema,
  classEarningsSchema,
  salaryHistorySchema,
  reportExportRequestSchema,
  reportExportResultSchema,
  type ClassPeriodInput,
  type TeacherReportInput,
  type CurriculumCoverageInput,
  type CurriculumAnalyticsInput,
  type ClassEarningsInput,
  type SalaryHistoryInput,
  type ReportExportRequestInput,
} from "@/lib/schemas/reporting";

/**
 * FSMS V2 — ReportingRepository (Phase 20).
 *
 * Read models over Progress/Attendance/Assessments/Curriculum/Payments/Salaries
 * — the V101 report set (`studentProgressReport`, `learnerProgressOverview`,
 * `attendanceSheet`, `performance`, `report`, `curriculumCoverage`,
 * `curriculumAnalytics`, `classEarnings`, `salaryHistory`) — plus the NEW async
 * CSV export queue (`report_exports`). Every RPC is SECURITY DEFINER and
 * re-checks permissions + tenant scoping, so the repository only pre-checks
 * RBAC for a user-safe failure and never trusts client input.
 */

// ── student progress report ──────────────────────────────────────────────────

export interface StudentProgressReportStudent {
  id: string;
  name: string | null;
  student_no: string | null;
  level_code: string | null;
  academic_status: string | null;
  current_progress: string | null;
  progress_mode: string | null;
  joined_at: string | null;
}

export interface LevelHistoryEntry {
  level_code: string | null;
  started_at: string | null;
  completed_at: string | null;
  final_progress: string | null;
  badges_earned: string | null;
  status: string | null;
  legacy: boolean | null;
}

export interface EvidenceByTarget {
  target_id: string;
  target_title: string | null;
  level_code: string | null;
  count: number;
  avg_score: number | null;
  last_at: string | null;
}

export interface StudentProgressReport {
  student: StudentProgressReportStudent | null;
  level_history: LevelHistoryEntry[];
  attendance: { present: number; late: number; absent: number; rate: number } | null;
  assessments: { count: number; avg_score: number | null; best_score: number | null; latest_at: string | null } | null;
  evidence: { count: number; avg_score: number | null } | null;
  evidence_by_target: EvidenceByTarget[];
  balance: { collected: number; pending: number } | null;
}

// ── learner progress overview ────────────────────────────────────────────────

export interface LearnerProgressRow {
  id: string;
  name: string | null;
  student_no: string | null;
  level_code: string | null;
  academic_status: string | null;
  current_progress: string | null;
  evidence_count: number;
  evidence_avg: number | null;
  attendance_rate: number | null;
  assessment_avg: number | null;
}

export interface LearnerProgressOverview {
  class: { id: string; name: string | null; level_code: string | null } | null;
  students: LearnerProgressRow[];
}

// ── attendance / assessment reports ──────────────────────────────────────────

export interface AttendanceReportRow {
  id: string;
  name: string | null;
  student_no: string | null;
  present: number;
  late: number;
  absent: number;
  total: number;
  rate: number | null;
}

export interface AttendanceReport {
  class: { id: string; name: string | null } | null;
  range: { from: string | null; to: string | null };
  students: AttendanceReportRow[];
}

export interface AssessmentReportRow {
  id: string;
  name: string | null;
  student_no: string | null;
  count: number;
  avg_score: number | null;
  best_score: number | null;
  latest: string | null;
}

export interface AssessmentReport {
  class: { id: string; name: string | null } | null;
  students: AssessmentReportRow[];
}

// ── class report ─────────────────────────────────────────────────────────────

export interface ClassReportClass {
  id: string;
  name: string | null;
  level_code: string | null;
  fee: number | null;
  fee_currency: string | null;
  status: string | null;
  days: string | null;
  start_time: string | null;
  end_time: string | null;
}

export interface ClassReportTeacher {
  id: string;
  name: string | null;
  primary: boolean | null;
}

export interface ClassReport {
  class: ClassReportClass | null;
  teachers: ClassReportTeacher[];
  enrolment: number;
  attendance_rate: number | null;
  assessment_avg: number | null;
  lessons_taught: number;
  balance: { collected: number; pending: number } | null;
}

// ── teacher report ───────────────────────────────────────────────────────────

export interface TeacherReportClass {
  id: string;
  name: string | null;
  primary: boolean | null;
  enrolment: number;
  attendance_rate: number | null;
  lessons_taught: number;
}

export interface TeacherReport {
  teacher: { id: string; name: string | null; email: string | null } | null;
  classes: TeacherReportClass[];
  attendance_taken: number;
  salary: { count: number; total: number } | null;
}

// ── curriculum coverage ──────────────────────────────────────────────────────

export interface CurriculumCoverageTaught {
  date: string | null;
  lesson_no: number | null;
  topic: string | null;
  teacher_name: string | null;
}

export interface CurriculumCoverage {
  class: { id: string; name: string | null } | null;
  planned: number;
  taught: CurriculumCoverageTaught[];
  taught_count: number;
}

// ── curriculum analytics ─────────────────────────────────────────────────────

export interface CurriculumAnalytics {
  topics: { level_code: string | null; count: number; published: number }[] | null;
  targets: { level_code: string | null; count: number; human_verified: number }[] | null;
  evidence: { level_code: string | null; count: number; avg_score: number | null }[] | null;
  programmes: number;
  lessons: number;
}

// ── class earnings ───────────────────────────────────────────────────────────

export interface ClassEarningsRow {
  id: string;
  name: string | null;
  students: number;
  fee: number | null;
  expected: number | null;
  collected: number | null;
  pending: number | null;
}

export interface ClassEarnings {
  rows: ClassEarningsRow[];
}

// ── salary history ───────────────────────────────────────────────────────────

export interface SalaryHistoryRow {
  id: string;
  user_id: string;
  user_name: string | null;
  month: string;
  amount: number;
  currency: string | null;
  status: string | null;
  created_at: string | null;
}

export interface SalaryHistory {
  rows: SalaryHistoryRow[];
  total: number;
}

// ── export queue ─────────────────────────────────────────────────────────────

export interface ReportExportJob {
  id: string;
  kind: string;
  status: string;
  params: Record<string, unknown> | null;
  requested_by: string | null;
  requested_by_name: string | null;
  created_at: string | null;
  completed_at: string | null;
  error: string | null;
}

export interface ReportExportList {
  rows: ReportExportJob[];
}

export interface ReportExportResult {
  id: string;
  kind: string;
  status: string;
  payload: string | null;
  error: string | null;
  created_at: string | null;
  completed_at: string | null;
}

export interface ReportExportRequested {
  id: string;
  kind: string;
  status: string;
  created_at: string;
}

export class ReportingRepository extends Repository {
  async studentProgressReport(input: unknown): Promise<ServiceResult<StudentProgressReport | null>> {
    const parsed = parseOrFail(studentProgressReportSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("studentProgressReport");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<StudentProgressReport | null>(
      "student_progress_report",
      { p_student: parsed.data.studentId },
    );
    if (error) return fail(error);
    return ok(data);
  }

  async learnerProgressOverview(input: unknown): Promise<ServiceResult<LearnerProgressOverview | null>> {
    const parsed = parseOrFail(learnerProgressOverviewSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("learnerProgressOverview");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<LearnerProgressOverview | null>(
      "learner_progress_overview",
      { p_class: parsed.data.classId },
    );
    if (error) return fail(error);
    return ok(data);
  }

  async attendanceReport(input: unknown): Promise<ServiceResult<AttendanceReport | null>> {
    const parsed = parseOrFail(classPeriodSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("attendanceSheet");
    if (denied) return fail(denied);
    const f: ClassPeriodInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<AttendanceReport | null>("attendance_report", {
      p_class: f.classId,
      p_from: f.from ?? null,
      p_to: f.to ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async assessmentReport(input: unknown): Promise<ServiceResult<AssessmentReport | null>> {
    const parsed = parseOrFail(classPeriodSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("performance");
    if (denied) return fail(denied);
    const f: ClassPeriodInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<AssessmentReport | null>("assessment_report", {
      p_class: f.classId,
      p_from: f.from ?? null,
      p_to: f.to ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async classReport(input: unknown): Promise<ServiceResult<ClassReport | null>> {
    const parsed = parseOrFail(classReportSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("report");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<ClassReport | null>("class_report", {
      p_class: parsed.data.classId,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async teacherReport(input: unknown): Promise<ServiceResult<TeacherReport | null>> {
    const parsed = parseOrFail(teacherReportSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("report");
    if (denied) return fail(denied);
    const f: TeacherReportInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<TeacherReport | null>("teacher_report", {
      p_teacher: f.teacherId ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async curriculumCoverage(input: unknown): Promise<ServiceResult<CurriculumCoverage | null>> {
    const parsed = parseOrFail(curriculumCoverageSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("curriculumCoverage");
    if (denied) return fail(denied);
    const f: CurriculumCoverageInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<CurriculumCoverage | null>("curriculum_coverage", {
      p_class: f.classId,
      p_from: f.from ?? null,
      p_to: f.to ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async curriculumAnalytics(input: unknown): Promise<ServiceResult<CurriculumAnalytics | null>> {
    const parsed = parseOrFail(curriculumAnalyticsSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("curriculumAnalytics");
    if (denied) return fail(denied);
    const f: CurriculumAnalyticsInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<CurriculumAnalytics | null>("curriculum_analytics", {
      p_level: f.level ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async classEarnings(input: unknown): Promise<ServiceResult<ClassEarnings | null>> {
    const parsed = parseOrFail(classEarningsSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("classEarnings");
    if (denied) return fail(denied);
    const f: ClassEarningsInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<ClassEarnings | null>("class_earnings", {
      p_from: f.from ?? null,
      p_to: f.to ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async salaryHistory(input: unknown): Promise<ServiceResult<SalaryHistory | null>> {
    const parsed = parseOrFail(salaryHistorySchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("salaryHistory");
    if (denied) return fail(denied);
    const f: SalaryHistoryInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<SalaryHistory | null>("salary_history", {
      p_user: f.userId ?? null,
      p_month: f.month ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async requestExport(input: unknown): Promise<ServiceResult<ReportExportRequested | null>> {
    const parsed = parseOrFail(reportExportRequestSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("report");
    if (denied) return fail(denied);
    const f: ReportExportRequestInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<ReportExportRequested | null>("report_export_request", {
      p_kind: f.kind,
      p_params: f.params ?? {},
    });
    if (error) return fail(error);
    return ok(data);
  }

  async processExports(): Promise<ServiceResult<{ processed: number } | null>> {
    const denied = this.can("report");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<{ processed: number } | null>("report_export_process", {});
    if (error) return fail(error);
    return ok(data);
  }

  async exportList(): Promise<ServiceResult<ReportExportList | null>> {
    const denied = this.can("report");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<ReportExportList | null>("report_export_list", {});
    if (error) return fail(error);
    return ok(data);
  }

  async exportResult(input: unknown): Promise<ServiceResult<ReportExportResult | null>> {
    const parsed = parseOrFail(reportExportResultSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("report");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<ReportExportResult | null>("report_export_result", {
      p_job: parsed.data.jobId,
    });
    if (error) return fail(error);
    return ok(data);
  }
}
