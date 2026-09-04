import { z } from "zod";

/**
 * FSMS V2 — assessments schemas (Phase 17), shared between repositories and
 * forms. Scores are numeric strings so the RPC coerces them server-side.
 */

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const uuid = () => z.string().regex(UUID_RE, "Invalid id");
const optDate = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.string().date("Invalid date (expected YYYY-MM-DD)").optional(),
);

export const assessmentListSchema = z.object({
  studentId: uuid().nullish(),
  classId: uuid().nullish(),
  from: optDate,
  to: optDate,
  pageSize: z.number().int().min(1).max(100).default(50),
  cursor: z.string().max(500).nullish(),
});
export type AssessmentListFilters = z.infer<typeof assessmentListSchema>;

export const assessmentTestsSchema = z.object({
  studentId: uuid().nullish(),
  status: z.string().trim().max(20).nullish(),
});
export type AssessmentTestsFilters = z.infer<typeof assessmentTestsSchema>;

export const assessmentTestDetailSchema = z.object({
  testId: uuid(),
});
export type AssessmentTestDetailInput = z.infer<typeof assessmentTestDetailSchema>;

export const saveAssessmentTestSchema = z.object({
  studentId: uuid(),
  classId: uuid().nullish(),
  title: z.string().trim().min(1, "Title is required").max(120),
  difficulty: z.string().trim().max(20).nullish(),
  types: z.array(z.string().trim().max(30)).max(20).nullish(),
  tasks: z.array(z.record(z.string(), z.unknown())).min(1, "At least one task is required").max(40),
  mode: z.enum(["ai", "manual", "hybrid"]).nullish(),
});
export type SaveAssessmentTestInput = z.infer<typeof saveAssessmentTestSchema>;

export const recordAssessmentTestSchema = z.object({
  testId: uuid(),
  marks: z
    .array(z.object({ n: z.number().int().min(1), correct: z.boolean() }))
    .min(1, "At least one mark is required"),
});
export type RecordAssessmentTestInput = z.infer<typeof recordAssessmentTestSchema>;

export const saveAssessmentSchema = z.object({
  studentId: uuid(),
  classId: uuid().nullish(),
  date: optDate,
  type: z.string().trim().max(60).nullish(),
  title: z.string().trim().max(200).nullish(),
  score: z.coerce.number().min(0).max(100000).nullish(),
  maxScore: z.coerce.number().min(0).max(100000).nullish(),
  note: z.string().trim().max(1000).nullish(),
});
export type SaveAssessmentInput = z.infer<typeof saveAssessmentSchema>;

export const assessmentPerformanceSchema = z.object({
  studentId: uuid().nullish(),
  from: optDate,
  to: optDate,
});
export type AssessmentPerformanceFilters = z.infer<typeof assessmentPerformanceSchema>;

export const archiveAssessmentTestSchema = z.object({
  testId: uuid(),
});
export type ArchiveAssessmentTestInput = z.infer<typeof archiveAssessmentTestSchema>;
