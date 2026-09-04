import { z } from "zod";

/**
 * FSMS V2 — attendance schemas (Phase 14), shared between repositories and the
 * bulk-marking form. Dates are strings (HTML date inputs) and are passed
 * through to the RPCs.
 */

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const uuid = () => z.string().regex(UUID_RE, "Invalid id");
const optDate = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.string().date("Invalid date (expected YYYY-MM-DD)").optional(),
);

export const attendanceGridSchema = z.object({
  classId: uuid(),
  date: z.string().date("Invalid date"),
});

export const attendanceMarkSchema = z.object({
  studentId: uuid(),
  status: z.enum(["present", "absent", "late"]),
  minutesLate: z.coerce.number().int().min(0).max(600).nullish(),
  note: z.string().trim().max(500).nullish(),
});

export const saveAttendanceSchema = z.object({
  classId: uuid(),
  date: z.string().date("Invalid date"),
  marks: z.array(attendanceMarkSchema).min(1, "No marks to save"),
});

export const attendanceHistorySchema = z.object({
  classId: uuid().nullish(),
  studentId: uuid().nullish(),
  from: optDate,
  to: optDate,
  pageSize: z.number().int().min(1).max(100).default(50),
  cursor: z.string().max(500).nullish(),
});

export const attendanceStatsSchema = z.object({
  classId: uuid(),
  from: optDate,
  to: optDate,
});

export const myAttendanceSchema = z.object({
  studentId: uuid(),
});

export type AttendanceGridInput = z.infer<typeof attendanceGridSchema>;
export type AttendanceMarkInput = z.infer<typeof attendanceMarkSchema>;
export type SaveAttendanceInput = z.infer<typeof saveAttendanceSchema>;
export type AttendanceHistoryFilters = z.infer<typeof attendanceHistorySchema>;
export type AttendanceStatsInput = z.infer<typeof attendanceStatsSchema>;
