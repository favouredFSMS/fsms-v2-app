import { z } from "zod";

/**
 * FSMS V2 — lessons schemas (Phase 16), shared between repositories and forms.
 */

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const uuid = () => z.string().regex(UUID_RE, "Invalid id");
const optDate = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.string().date("Invalid date (expected YYYY-MM-DD)").optional(),
);

export const lessonSpineSchema = z.object({
  programmeId: uuid().nullish(),
});
export type LessonSpineInput = z.infer<typeof lessonSpineSchema>;

export const lessonDetailSchema = z.object({
  lessonId: uuid(),
});
export type LessonDetailInput = z.infer<typeof lessonDetailSchema>;

export const lessonLogListSchema = z.object({
  classId: uuid().nullish(),
  from: optDate,
  to: optDate,
  pageSize: z.number().int().min(1).max(100).default(50),
  cursor: z.string().max(500).nullish(),
});
export type LessonLogListFilters = z.infer<typeof lessonLogListSchema>;

export const saveLessonLogSchema = z.object({
  classId: uuid(),
  date: z.string().date("Invalid date"),
  lessonNo: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().min(1).max(999).optional(),
  ),
  topic: z.string().trim().max(400).nullish(),
  topicIds: z.array(uuid()).max(50).nullish(),
  participation: z.string().trim().max(200).nullish(),
  teacherNote: z.string().trim().max(2000).nullish(),
  durationMin: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().min(1).max(1000).optional(),
  ),
});
export type SaveLessonLogInput = z.infer<typeof saveLessonLogSchema>;

export const lessonPlansSchema = z.object({
  classId: uuid().nullish(),
  lessonId: uuid().nullish(),
});
export type LessonPlansFilters = z.infer<typeof lessonPlansSchema>;

export const saveLessonPlanSchema = z.object({
  classId: uuid(),
  lessonId: uuid().nullish(),
  plan: z.string().trim().max(4000).nullish(),
  source: z.string().trim().max(100).nullish(),
});
export type SaveLessonPlanInput = z.infer<typeof saveLessonPlanSchema>;

export const lessonChangeRequestSchema = z.object({
  classId: uuid(),
  fromDate: z.string().date("Invalid date"),
  toDate: optDate,
  reason: z.string().trim().min(1, "Reason is required").max(300),
});
export type LessonChangeRequestInput = z.infer<typeof lessonChangeRequestSchema>;

export const lessonChangeListSchema = z.object({
  classId: uuid().nullish(),
});
export type LessonChangeListFilters = z.infer<typeof lessonChangeListSchema>;

export const decideLessonChangeSchema = z.object({
  changeId: uuid(),
  decision: z.enum(["approved", "declined"]),
});
export type DecideLessonChangeInput = z.infer<typeof decideLessonChangeSchema>;

export const lessonControlsSchema = z.object({
  classId: uuid().nullish(),
});
export type LessonControlsFilters = z.infer<typeof lessonControlsSchema>;

export const saveLessonControlSchema = z.object({
  classId: uuid(),
  key: z.string().trim().min(1, "Key is required").max(120),
  value: z.string().trim().max(4000).nullish(),
});
export type SaveLessonControlInput = z.infer<typeof saveLessonControlSchema>;
