import { z } from "zod";

/**
 * FSMS V2 — academic-structure schemas (Phase 13), shared between repositories
 * and client forms (architecture §6). Dates are strings (HTML date inputs) and
 * are passed through to the RPC, whose signatures coerce them server-side.
 */

/** Seed/data IDs use fixed UUIDs with a version nibble of 0; accept any hex UUID. */
const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const uuid = () => z.string().regex(UUID_RE, "Invalid id");

const optDate = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.string().date("Invalid date (expected YYYY-MM-DD)").optional(),
);

export const classSearchSchema = z.object({
  search: z.string().trim().max(200).nullish(),
  level: z.string().trim().max(20).nullish(),
  status: z.string().trim().max(30).nullish(),
  pageSize: z.number().int().min(1).max(100).default(20),
  cursor: z.string().max(500).nullish(),
});

export const classCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  levelCode: z.string().trim().max(20).nullish(),
  classType: z.string().trim().max(30).nullish(),
  learnerType: z.enum(["children", "teenagers", "adults", "general"]).nullish(),
  room: z.string().trim().max(60).nullish(),
  academicYearId: uuid().nullish(),
  termId: uuid().nullish(),
});

export const yearCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  startsOn: optDate,
  endsOn: optDate,
});

export const termCreateSchema = z.object({
  academicYearId: uuid(),
  name: z.string().trim().min(1, "Name is required").max(200),
  startsOn: optDate,
  endsOn: optDate,
});

export const subjectCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
});

export const assignTeacherSchema = z.object({
  classId: uuid(),
  userId: uuid(),
  primary: z.boolean().default(false),
});

export const enrolStudentSchema = z.object({
  studentId: uuid(),
  classId: uuid(),
});

export const enrolmentStatusSchema = z.object({
  enrolmentId: uuid(),
  status: z.enum(["active", "inactive", "left", "completed", "transferred", "dropped"]),
});

export type ClassSearchFilters = z.infer<typeof classSearchSchema>;
export type ClassCreateInput = z.infer<typeof classCreateSchema>;
export type YearCreateInput = z.infer<typeof yearCreateSchema>;
export type TermCreateInput = z.infer<typeof termCreateSchema>;
export type SubjectCreateInput = z.infer<typeof subjectCreateSchema>;
export type AssignTeacherInput = z.infer<typeof assignTeacherSchema>;
export type EnrolStudentInput = z.infer<typeof enrolStudentSchema>;
export type EnrolmentStatusInput = z.infer<typeof enrolmentStatusSchema>;
