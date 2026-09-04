import { z } from "zod";

/**
 * FSMS V2 — curriculum & learning schemas (Phase 18), shared between
 * repositories and client forms. Mirrors the V2 content spine:
 * Programme → Unit → Lesson → Objective → Skill → Evidence → Progress.
 */

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const uuid = () => z.string().regex(UUID_RE, "Invalid id");
const optText = (max = 200) => z.string().trim().max(max).nullish();
const optUuid = () => uuid().nullish();
const optInt = () =>
  z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().min(1).max(9999).optional(),
  );
const optDate = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.string().date("Invalid date (expected YYYY-MM-DD)").optional(),
);

// ── spine authoring (leadership: curriculumManagement) ───────────────────────

export const saveProgrammeSchema = z.object({
  id: optUuid(),
  name: z.string().trim().max(200).nullish(),
  code: z.string().trim().max(40).nullish(),
  type: optText(40),
  standard: z.boolean().default(false),
});
export type SaveProgrammeInput = z.infer<typeof saveProgrammeSchema>;

export const saveUnitSchema = z.object({
  id: optUuid(),
  programmeId: optUuid(),
  title: optText(200),
  code: optText(40),
  no: optInt(),
});
export type SaveUnitInput = z.infer<typeof saveUnitSchema>;

export const saveLessonSchema = z.object({
  id: optUuid(),
  unitId: optUuid(),
  title: optText(200),
  code: optText(40),
  no: optInt(),
});
export type SaveLessonInput = z.infer<typeof saveLessonSchema>;

export const saveObjectiveSchema = z.object({
  id: optUuid(),
  lessonId: optUuid(),
  text: z.string().trim().max(400).nullish(),
  code: optText(40),
  cefr: optText(10),
});
export type SaveObjectiveInput = z.infer<typeof saveObjectiveSchema>;

// ── topics ───────────────────────────────────────────────────────────────────

export const curriculumTopicsListSchema = z.object({
  level: optText(20),
});
export type CurriculumTopicsListFilters = z.infer<typeof curriculumTopicsListSchema>;

export const saveCurriculumTopicSchema = z.object({
  id: optUuid(),
  title: z.string().trim().max(200).nullish(),
  levelCode: optText(20),
  courseSection: optText(60),
  published: z.boolean().default(false),
});
export type SaveCurriculumTopicInput = z.infer<typeof saveCurriculumTopicSchema>;

// ── evidence (staff write: recordLearningCheck) ──────────────────────────────

export const saveEvidenceSchema = z.object({
  studentId: uuid(),
  targetId: uuid(),
  topicId: optUuid(),
  lessonId: optUuid(),
  score: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().min(0).max(1000).optional(),
  ),
  rating: z.string().trim().max(20).nullish(),
  quality: z.enum(["weak", "ok", "strong"]).nullish(),
  note: z.string().trim().max(2000).nullish(),
});
export type SaveEvidenceInput = z.infer<typeof saveEvidenceSchema>;

export const evidenceListSchema = z.object({
  studentId: optUuid(),
  from: optDate,
  to: optDate,
  pageSize: z.number().int().min(1).max(100).default(50),
  cursor: z.string().max(500).nullish(),
});
export type EvidenceListFilters = z.infer<typeof evidenceListSchema>;

export const learnerProgressSchema = z.object({
  studentId: uuid(),
});
export type LearnerProgressInput = z.infer<typeof learnerProgressSchema>;

// ── curricula container ──────────────────────────────────────────────────────

export const importCurriculumSchema = z.object({
  programmeId: optUuid(),
  title: z.string().trim().min(1, "Title is required").max(200),
  publisher: optText(200),
  payload: z.string().trim().max(20000).nullish(),
});
export type ImportCurriculumInput = z.infer<typeof importCurriculumSchema>;

export const curriculumDecisionSchema = z.object({
  curriculumId: uuid(),
});
export type CurriculumDecisionInput = z.infer<typeof curriculumDecisionSchema>;

export const saveCurriculumSchema = z.object({
  curriculumId: uuid(),
  title: optText(200),
  publisher: optText(200),
});
export type SaveCurriculumInput = z.infer<typeof saveCurriculumSchema>;

export const duplicateCurriculumSchema = z.object({
  curriculumId: uuid(),
  title: optText(200),
});
export type DuplicateCurriculumInput = z.infer<typeof duplicateCurriculumSchema>;

export const assignCurriculumSchema = z.object({
  curriculumId: uuid(),
  classId: uuid(),
});
export type AssignCurriculumInput = z.infer<typeof assignCurriculumSchema>;
