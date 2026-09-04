import { Repository } from "../repository";
import { parseOrFail } from "../validate";
import { ok, fail, type ServiceResult } from "../errors";
import type { Page } from "../pagination";
import {
  assessmentListSchema,
  assessmentTestsSchema,
  assessmentTestDetailSchema,
  saveAssessmentTestSchema,
  recordAssessmentTestSchema,
  saveAssessmentSchema,
  assessmentPerformanceSchema,
  archiveAssessmentTestSchema,
  type AssessmentListFilters,
  type AssessmentTestsFilters,
  type SaveAssessmentTestInput,
  type RecordAssessmentTestInput,
  type SaveAssessmentInput,
  type AssessmentPerformanceFilters,
} from "@/lib/schemas/assessments";

/**
 * FSMS V2 — AssessmentRepository (Phase 17).
 *
 * Assessment tests (questions/tasks), marking/grading (assessments rows),
 * results/history and performance summaries. Writes are pre-checked here and
 * re-checked inside each SECURITY DEFINER RPC.
 */

export interface AssessmentItem {
  id: string;
  date: string;
  class_id: string | null;
  class_name: string | null;
  student_id: string;
  student_name: string | null;
  student_no: string | null;
  type: string | null;
  title: string | null;
  score: number | string | null;
  max_score: number | string | null;
  note: string | null;
  recorded_by: string | null;
  recorded_by_name: string | null;
  edited_by: string | null;
  edited_by_name: string | null;
  edited_at: string | null;
}

export interface AssessmentTest {
  id: string;
  student_id: string | null;
  student_name: string | null;
  class_id: string | null;
  class_name: string | null;
  title: string | null;
  source_month: string | null;
  from_date: string | null;
  to_date: string | null;
  difficulty: string | null;
  types: unknown | null;
  task_count: number | null;
  status: string;
  mode: string | null;
  published_at: string | null;
  created_at: string | null;
}

export interface AssessmentTestDetail extends AssessmentTest {
  tasks: Array<Record<string, unknown>> | null;
}

export interface AssessmentPerformance {
  students: Array<{
    student_id: string;
    student_name: string | null;
    count: number;
    avg_pct: number | null;
    best_pct: number | null;
    latest_date: string | null;
  }>;
  recent: Array<{
    id: string;
    date: string;
    type: string | null;
    title: string | null;
    score: number | null;
    max_score: number | null;
  }>;
}

export class AssessmentRepository extends Repository {
  /** Paginated results/history, visibility-scoped. */
  async list(input: unknown): Promise<ServiceResult<Page<AssessmentItem>>> {
    const parsed = parseOrFail(assessmentListSchema, input);
    if (!parsed.ok) return parsed;
    const f: AssessmentListFilters = parsed.data;

    const { data, error } = await this.ctx.db.rpc<{ rows: AssessmentItem[]; total: number; next_cursor: string | null }>(
      "assessment_list",
      {
        p_student: f.studentId ?? null,
        p_class: f.classId ?? null,
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

  /** Assessment tests (staff school, family own published). */
  async tests(input: unknown): Promise<ServiceResult<AssessmentTest[]>> {
    const parsed = parseOrFail(assessmentTestsSchema, input);
    if (!parsed.ok) return parsed;
    const f: AssessmentTestsFilters = parsed.data;

    const { data, error } = await this.ctx.db.rpc<{ rows: AssessmentTest[] }>("assessment_tests", {
      p_student: f.studentId ?? null,
      p_status: f.status ?? null,
    });
    if (error) return fail(error);
    return ok((data as { rows: AssessmentTest[] } | null)?.rows ?? []);
  }

  /** One test with its tasks. */
  async testDetail(input: unknown): Promise<ServiceResult<AssessmentTestDetail | null>> {
    const parsed = parseOrFail(assessmentTestDetailSchema, input);
    if (!parsed.ok) return parsed;
    const { data, error } = await this.ctx.db.rpc<AssessmentTestDetail | null>("assessment_test_detail", {
      p_test: parsed.data.testId,
    });
    if (error) return fail(error);
    return ok(data);
  }

  /** Staff create an assessment test (published). */
  async saveTest(input: unknown): Promise<ServiceResult<AssessmentTest | null>> {
    const parsed = parseOrFail(saveAssessmentTestSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("saveAssessment");
    if (denied) return fail(denied);
    const f: SaveAssessmentTestInput = parsed.data;

    const { data, error } = await this.ctx.db.rpc<AssessmentTest | null>("save_assessment_test", {
      p_student: f.studentId,
      p_class: f.classId ?? null,
      p_title: f.title,
      p_difficulty: f.difficulty ?? null,
      p_types: f.types ? JSON.stringify(f.types) : null,
      p_tasks: JSON.stringify(f.tasks),
      p_mode: f.mode ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  /** Record a completed test (score = % correct). */
  async recordTest(
    input: unknown,
  ): Promise<ServiceResult<{ assessment_id: string; score: number; correct: number; total: number } | null>> {
    const parsed = parseOrFail(recordAssessmentTestSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("saveAssessment");
    if (denied) return fail(denied);
    const f: RecordAssessmentTestInput = parsed.data;

    const { data, error } = await this.ctx.db.rpc<{
      assessment_id: string;
      score: number;
      correct: number;
      total: number;
    } | null>("record_assessment_test", {
      p_test: f.testId,
      p_marks: JSON.stringify(f.marks),
    });
    if (error) return fail(error);
    return ok(data);
  }

  /** Generic mark entry (grading + results). */
  async save(input: unknown): Promise<ServiceResult<AssessmentItem | null>> {
    const parsed = parseOrFail(saveAssessmentSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("saveAssessment");
    if (denied) return fail(denied);
    const f: SaveAssessmentInput = parsed.data;

    const { data, error } = await this.ctx.db.rpc<AssessmentItem | null>("save_assessment", {
      p_student: f.studentId,
      p_class: f.classId ?? null,
      p_date: f.date ?? null,
      p_type: f.type ?? null,
      p_title: f.title ?? null,
      p_score: f.score ?? null,
      p_max_score: f.maxScore ?? null,
      p_note: f.note ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  /** Per-student performance summary (staff). */
  async performance(input: unknown): Promise<ServiceResult<AssessmentPerformance | null>> {
    const parsed = parseOrFail(assessmentPerformanceSchema, input);
    if (!parsed.ok) return parsed;
    const f: AssessmentPerformanceFilters = parsed.data;

    const { data, error } = await this.ctx.db.rpc<AssessmentPerformance | null>("assessment_performance", {
      p_student: f.studentId ?? null,
      p_from: f.from ?? null,
      p_to: f.to ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  /** Author/leadership archive a test. */
  async archiveTest(input: unknown): Promise<ServiceResult<{ id: string; status: string } | null>> {
    const parsed = parseOrFail(archiveAssessmentTestSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("saveAssessment");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<{ id: string; status: string } | null>(
      "archive_assessment_test",
      { p_test: parsed.data.testId },
    );
    if (error) return fail(error);
    return ok(data);
  }
}
