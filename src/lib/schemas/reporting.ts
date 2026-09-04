import { z } from "zod";

/**
 * FSMS V2 — reporting schemas (Phase 20), shared between repositories and
 * client forms. Covers the V101 report set (student progress, learner
 * overview, attendance, assessment, class, teacher, curriculum, earnings,
 * salary) plus the NEW async CSV export queue. Dates are HTML strings
 * (YYYY-MM-DD) and are passed through to the RPCs unchanged.
 */

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const uuid = () => z.string().regex(UUID_RE, "Invalid id");
const optUuid = () => uuid().nullish();
const optDate = () => z.string().date("Invalid date (expected YYYY-MM-DD)").nullish();

// ── student report ───────────────────────────────────────────────────────────

export const studentProgressReportSchema = z.object({ studentId: uuid() });
export type StudentProgressReportInput = z.infer<typeof studentProgressReportSchema>;

// ── academic overview (per class) ────────────────────────────────────────────

export const learnerProgressOverviewSchema = z.object({ classId: uuid() });
export type LearnerProgressOverviewInput = z.infer<typeof learnerProgressOverviewSchema>;

// ── attendance / assessment reports (class + optional period) ────────────────

export const classPeriodSchema = z.object({
  classId: uuid(),
  from: optDate(),
  to: optDate(),
});
export type ClassPeriodInput = z.infer<typeof classPeriodSchema>;

// ── class report ─────────────────────────────────────────────────────────────

export const classReportSchema = z.object({ classId: uuid() });
export type ClassReportInput = z.infer<typeof classReportSchema>;

// ── teacher report ───────────────────────────────────────────────────────────

export const teacherReportSchema = z.object({ teacherId: optUuid() });
export type TeacherReportInput = z.infer<typeof teacherReportSchema>;

// ── curriculum coverage (class + optional period) ────────────────────────────

export const curriculumCoverageSchema = classPeriodSchema;
export type CurriculumCoverageInput = z.infer<typeof curriculumCoverageSchema>;

// ── curriculum analytics ─────────────────────────────────────────────────────

export const curriculumAnalyticsSchema = z.object({
  level: z.string().trim().max(20).nullish(),
});
export type CurriculumAnalyticsInput = z.infer<typeof curriculumAnalyticsSchema>;

// ── class earnings ───────────────────────────────────────────────────────────

export const classEarningsSchema = z.object({ from: optDate(), to: optDate() });
export type ClassEarningsInput = z.infer<typeof classEarningsSchema>;

// ── salary history ───────────────────────────────────────────────────────────

export const salaryHistorySchema = z.object({
  userId: optUuid(),
  month: z
    .string()
    .trim()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Invalid month (expected YYYY-MM)")
    .nullish(),
});
export type SalaryHistoryInput = z.infer<typeof salaryHistorySchema>;

// ── export queue ─────────────────────────────────────────────────────────────

export const EXPORT_KINDS = [
  "attendance",
  "assessment",
  "learner-progress",
  "class-earnings",
  "salary",
] as const;

export const reportExportRequestSchema = z.object({
  kind: z.enum(EXPORT_KINDS),
  params: z.record(z.string(), z.unknown()).nullish(),
});
export type ReportExportRequestInput = z.infer<typeof reportExportRequestSchema>;

export const reportExportResultSchema = z.object({ jobId: uuid() });
export type ReportExportResultInput = z.infer<typeof reportExportResultSchema>;
