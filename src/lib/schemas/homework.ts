import { z } from "zod";

/**
 * FSMS V2 — homework schemas (Phase 15), shared between repositories and forms.
 */

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const uuid = () => z.string().regex(UUID_RE, "Invalid id");
const optDate = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.string().date("Invalid date (expected YYYY-MM-DD)").optional(),
);

export const homeworkListSchema = z.object({
  classId: uuid().nullish(),
  studentId: uuid().nullish(),
  status: z.string().trim().max(30).nullish(),
  from: optDate,
  to: optDate,
  pageSize: z.number().int().min(1).max(100).default(50),
  cursor: z.string().max(500).nullish(),
});

export const homeworkAssignSchema = z.object({
  classId: uuid(),
  date: z.string().date("Invalid date"),
  title: z.string().trim().min(1, "Title is required").max(400),
  dueDate: optDate,
  note: z.string().trim().max(1000).nullish(),
  studentIds: z.array(uuid()).min(1, "No students selected"),
});

export const homeworkSubmitSchema = z.object({
  homeworkId: uuid(),
  note: z.string().trim().max(1000).nullish(),
});

export const homeworkGradeSchema = z.object({
  homeworkId: uuid(),
  score: z.string().trim().max(50).nullish(),
  feedback: z.string().trim().max(4000).nullish(),
  status: z.enum(["graded", "missing", "overdue", "assigned"]),
});

export type HomeworkListFilters = z.infer<typeof homeworkListSchema>;
export type HomeworkAssignInput = z.infer<typeof homeworkAssignSchema>;
export type HomeworkSubmitInput = z.infer<typeof homeworkSubmitSchema>;
export type HomeworkGradeInput = z.infer<typeof homeworkGradeSchema>;
