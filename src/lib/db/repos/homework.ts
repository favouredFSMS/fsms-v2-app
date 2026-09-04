import { Repository } from "../repository";
import { parseOrFail } from "../validate";
import { ok, fail, type ServiceResult } from "../errors";
import type { Page } from "../pagination";
import {
  homeworkListSchema,
  homeworkAssignSchema,
  homeworkSubmitSchema,
  homeworkGradeSchema,
  type HomeworkListFilters,
  type HomeworkAssignInput,
  type HomeworkSubmitInput,
  type HomeworkGradeInput,
} from "@/lib/schemas/homework";

/**
 * FSMS V2 — HomeworkRepository (Phase 15).
 */

export interface HomeworkItem {
  id: string;
  date: string;
  class_id: string;
  class_name: string | null;
  student_id: string;
  student_name: string | null;
  student_no: string | null;
  lesson_no: number | null;
  title: string | null;
  status: string;
  score: string | null;
  note: string | null;
  due_date: string | null;
  feedback: string | null;
  graded_by: string | null;
  graded_at: string | null;
  batch_id: string | null;
  attachment: string | null;
  created_at: string | null;
  submissions: number;
  latest_note: string | null;
  latest_submitted_at: string | null;
}

export class HomeworkRepository extends Repository {
  /** Paginated, visibility-scoped homework rows. */
  async list(input: unknown): Promise<ServiceResult<Page<HomeworkItem>>> {
    const parsed = parseOrFail(homeworkListSchema, input);
    if (!parsed.ok) return parsed;
    const f: HomeworkListFilters = parsed.data;

    const { data, error } = await this.ctx.db.rpc<{ rows: HomeworkItem[]; total: number; next_cursor: string | null }>(
      "homework_list",
      {
        p_class: f.classId ?? null,
        p_student: f.studentId ?? null,
        p_status: f.status ?? null,
        p_from: f.from ?? null,
        p_to: f.to ?? null,
        p_page_size: f.pageSize,
        p_cursor: f.cursor ?? null,
      },
    );
    if (error) return fail(error);

    const res = data ?? { rows: [], total: 0, next_cursor: null };
    return ok({ items: res.rows, total: res.total, nextCursor: res.next_cursor });
  }

  /** Bulk assignment for a class/date (saveHomework). */
  async assign(input: unknown): Promise<ServiceResult<{ created: number } | null>> {
    const parsed = parseOrFail(homeworkAssignSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("saveHomework");
    if (denied) return fail(denied);
    const f: HomeworkAssignInput = parsed.data;

    const marks = f.studentIds.map((id) => ({
      student_id: id,
      title: f.title,
      due_date: f.dueDate ?? null,
      note: f.note ?? null,
    }));
    const { data, error } = await this.ctx.db.rpc<{ created: number } | null>("save_homework", {
      p_class: f.classId,
      p_date: f.date,
      p_marks: JSON.stringify(marks),
    });
    if (error) return fail(error);
    return ok(data);
  }

  /** Student/parent submission (submitHomework). */
  async submit(input: unknown): Promise<ServiceResult<{ id: string } | null>> {
    const parsed = parseOrFail(homeworkSubmitSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("submitHomework");
    if (denied) return fail(denied);
    const f: HomeworkSubmitInput = parsed.data;

    const { data, error } = await this.ctx.db.rpc<{ id: string } | null>("submit_homework", {
      p_homework: f.homeworkId,
      p_note: f.note ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  /** Staff grading (gradeHomework). */
  async grade(input: unknown): Promise<ServiceResult<{ id: string; status: string } | null>> {
    const parsed = parseOrFail(homeworkGradeSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("gradeHomework");
    if (denied) return fail(denied);
    const f: HomeworkGradeInput = parsed.data;

    const { data, error } = await this.ctx.db.rpc<{ id: string; status: string } | null>("grade_homework", {
      p_homework: f.homeworkId,
      p_score: f.score ?? null,
      p_feedback: f.feedback ?? null,
      p_status: f.status,
    });
    if (error) return fail(error);
    return ok(data);
  }
}
