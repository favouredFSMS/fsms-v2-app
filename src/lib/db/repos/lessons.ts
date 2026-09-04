import { Repository } from "../repository";
import { parseOrFail } from "../validate";
import { ok, fail, ServiceError, type ServiceResult } from "../errors";
import type { Page } from "../pagination";
import {
  lessonSpineSchema,
  lessonDetailSchema,
  lessonLogListSchema,
  saveLessonLogSchema,
  lessonPlansSchema,
  saveLessonPlanSchema,
  lessonChangeRequestSchema,
  lessonChangeListSchema,
  decideLessonChangeSchema,
  lessonControlsSchema,
  saveLessonControlSchema,
  type LessonLogListFilters,
  type SaveLessonLogInput,
  type LessonPlansFilters,
  type SaveLessonPlanInput,
  type LessonChangeRequestInput,
  type LessonChangeListFilters,
  type DecideLessonChangeInput,
  type LessonControlsFilters,
  type SaveLessonControlInput,
} from "@/lib/schemas/lessons";

/**
 * FSMS V2 — LessonRepository (Phase 16).
 *
 * Lesson planning (plans), lesson records (logs), curriculum links/objectives
 * (spine + detail), resources, teacher workflow (controls) and change history.
 * Writes are pre-checked here and re-checked inside each SECURITY DEFINER RPC.
 */

/** Localized jsonb title/text → display string (en fallback, i18n is Phase 24). */
export function localized(value: Record<string, unknown> | null | undefined, locale = "en"): string {
  if (!value || typeof value !== "object") return "";
  if (typeof value[locale] === "string") return value[locale] as string;
  if (typeof value.en === "string") return value.en as string;
  const first = Object.values(value)[0];
  return typeof first === "string" ? first : "";
}

export interface LessonRef {
  id: string;
  code: string | null;
  no: number | null;
  title: Record<string, string> | null;
  objective_count: number;
}

export interface LessonUnit {
  id: string;
  code: string | null;
  no: number | null;
  title: Record<string, string> | null;
  lessons: LessonRef[];
}

export interface LessonProgramme {
  id: string;
  code: string | null;
  name: Record<string, string> | null;
  type: string | null;
  standard: boolean;
  units: LessonUnit[];
}

export interface LessonSpine {
  programmes: LessonProgramme[];
}

export interface LessonObjective {
  id: string;
  code: string | null;
  text: Record<string, string> | null;
  cefr: string | null;
}

export interface LessonResource {
  id: string;
  title: Record<string, string> | null;
  url: string | null;
  file_path: string | null;
  kind: string | null;
}

export interface LessonDetail {
  id: string;
  code: string | null;
  no: number | null;
  title: Record<string, string> | null;
  objectives_meta: Record<string, unknown> | null;
  unit: { id: string; code: string | null; title: Record<string, string> | null } | null;
  programme: { id: string; code: string | null; name: Record<string, string> | null } | null;
  objectives: LessonObjective[];
  resources: LessonResource[];
}

export interface LessonLog {
  id: string;
  date: string;
  class_id: string;
  class_name: string | null;
  lesson_no: number | null;
  topic: string | null;
  topic_ids: unknown | null;
  participation: string | null;
  teacher_note: string | null;
  duration_min: number | null;
  learning_progress: unknown | null;
  curriculum_version: string | null;
  recommendation_id: string | null;
  created_by: string | null;
  created_at: string | null;
  teacher_name: string | null;
}

export interface LessonPlan {
  id: string;
  teacher_id: string;
  teacher_name: string | null;
  class_id: string | null;
  class_name: string | null;
  lesson_id: string | null;
  lesson_title: Record<string, string> | null;
  plan: Record<string, unknown> | null;
  source: string | null;
  created_at: string | null;
}

export interface LessonChange {
  id: string;
  class_id: string;
  class_name: string | null;
  from_date: string | null;
  to_date: string | null;
  reason: string | null;
  requested_by: string | null;
  requested_by_name: string | null;
  decided_by: string | null;
  decided_by_name: string | null;
  decision: string | null;
  created_at: string | null;
}

export interface LessonControl {
  id: string;
  class_id: string;
  class_name: string | null;
  key: string;
  value: unknown | null;
  updated_by: string | null;
  updated_by_name: string | null;
  updated_at: string | null;
}

export class LessonRepository extends Repository {
  /** Curriculum structure (programmes → units → lessons) for planning. */
  async spine(input: unknown): Promise<ServiceResult<LessonSpine | null>> {
    const parsed = parseOrFail(lessonSpineSchema, input);
    if (!parsed.ok) return parsed;
    const { data, error } = await this.ctx.db.rpc<LessonSpine | null>("lesson_spine", {
      p_programme: parsed.data.programmeId ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  /** One lesson with curriculum links, objectives and resources. */
  async detail(input: unknown): Promise<ServiceResult<LessonDetail | null>> {
    const parsed = parseOrFail(lessonDetailSchema, input);
    if (!parsed.ok) return parsed;
    const { data, error } = await this.ctx.db.rpc<LessonDetail | null>("lesson_detail", {
      p_lesson: parsed.data.lessonId,
    });
    if (error) return fail(error);
    return ok(data);
  }

  /** Paginated lesson records (history), visibility-scoped. */
  async logs(input: unknown): Promise<ServiceResult<Page<LessonLog>>> {
    const parsed = parseOrFail(lessonLogListSchema, input);
    if (!parsed.ok) return parsed;
    const f: LessonLogListFilters = parsed.data;

    const { data, error } = await this.ctx.db.rpc<{ rows: LessonLog[]; total: number; next_cursor: string | null }>(
      "lesson_log_list",
      {
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

  /** Upsert a lesson record per (class, date, lesson_no). */
  async saveLog(input: unknown): Promise<ServiceResult<LessonLog | null>> {
    const parsed = parseOrFail(saveLessonLogSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("saveLessonLog");
    if (denied) return fail(denied);
    const f: SaveLessonLogInput = parsed.data;

    const { data, error } = await this.ctx.db.rpc<LessonLog | null>("save_lesson_log", {
      p_class: f.classId,
      p_date: f.date,
      p_lesson_no: f.lessonNo ?? null,
      p_topic: f.topic ?? null,
      p_topic_ids: f.topicIds ? JSON.stringify(f.topicIds) : null,
      p_participation: f.participation ?? null,
      p_teacher_note: f.teacherNote ?? null,
      p_duration_min: f.durationMin ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  /** Leadership-only removal of a lesson record. */
  async deleteLog(input: { logId: string }): Promise<ServiceResult<{ id: string } | null>> {
    const denied = this.can("deleteLessonLog");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<{ id: string } | null>("delete_lesson_log", {
      p_log: input.logId,
    });
    if (error) return fail(error);
    return ok(data);
  }

  /** Lesson plans (staff see school, teachers see their own). */
  async plans(input: unknown): Promise<ServiceResult<LessonPlan[]>> {
    const parsed = parseOrFail(lessonPlansSchema, input);
    if (!parsed.ok) return parsed;
    const f: LessonPlansFilters = parsed.data;

    const { data, error } = await this.ctx.db.rpc<{ rows: LessonPlan[] }>("lesson_plans", {
      p_class: f.classId ?? null,
      p_lesson: f.lessonId ?? null,
    });
    if (error) return fail(error);
    return ok((data as { rows: LessonPlan[] } | null)?.rows ?? []);
  }

  /** Upsert a teacher lesson plan for a class/lesson. */
  async savePlan(input: unknown): Promise<ServiceResult<LessonPlan | null>> {
    const parsed = parseOrFail(saveLessonPlanSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("prepareLesson");
    if (denied) return fail(denied);
    const f: SaveLessonPlanInput = parsed.data;

    let plan: Record<string, unknown> | null = null;
    if (f.plan) {
      try {
        plan = JSON.parse(f.plan) as Record<string, unknown>;
      } catch {
        return fail(new ServiceError("invalid_input", 422, "Plan is not valid JSON"));
      }
    }

    const { data, error } = await this.ctx.db.rpc<LessonPlan | null>("save_lesson_plan", {
      p_class: f.classId,
      p_lesson: f.lessonId ?? null,
      p_plan: JSON.stringify(plan ?? {}),
      p_source: f.source ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  /** Request a lesson change (reschedule/cancel). */
  async requestChange(input: unknown): Promise<ServiceResult<LessonChange | null>> {
    const parsed = parseOrFail(lessonChangeRequestSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("requestLessonChange");
    if (denied) return fail(denied);
    const f: LessonChangeRequestInput = parsed.data;

    const { data, error } = await this.ctx.db.rpc<LessonChange | null>("lesson_change_request", {
      p_class: f.classId,
      p_from_date: f.fromDate,
      p_to_date: f.toDate ?? null,
      p_reason: f.reason,
    });
    if (error) return fail(error);
    return ok(data);
  }

  /** Lesson change requests (history), visibility-scoped. */
  async changes(input: unknown): Promise<ServiceResult<LessonChange[]>> {
    const parsed = parseOrFail(lessonChangeListSchema, input);
    if (!parsed.ok) return parsed;
    const f: LessonChangeListFilters = parsed.data;

    const { data, error } = await this.ctx.db.rpc<{ rows: LessonChange[] }>("lesson_change_list", {
      p_class: f.classId ?? null,
    });
    if (error) return fail(error);
    return ok((data as { rows: LessonChange[] } | null)?.rows ?? []);
  }

  /** Leadership decision (approved/declined). */
  async decideChange(input: unknown): Promise<ServiceResult<LessonChange | null>> {
    const parsed = parseOrFail(decideLessonChangeSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("decideLessonChange");
    if (denied) return fail(denied);
    const f: DecideLessonChangeInput = parsed.data;

    const { data, error } = await this.ctx.db.rpc<LessonChange | null>("decide_lesson_change", {
      p_change: f.changeId,
      p_decision: f.decision,
    });
    if (error) return fail(error);
    return ok(data);
  }

  /** Per-class lesson controls, visibility-scoped. */
  async controls(input: unknown): Promise<ServiceResult<LessonControl[]>> {
    const parsed = parseOrFail(lessonControlsSchema, input);
    if (!parsed.ok) return parsed;
    const f: LessonControlsFilters = parsed.data;

    const { data, error } = await this.ctx.db.rpc<{ rows: LessonControl[] }>("lesson_controls", {
      p_class: f.classId ?? null,
    });
    if (error) return fail(error);
    return ok((data as { rows: LessonControl[] } | null)?.rows ?? []);
  }

  /** Upsert a per-class lesson control (key → value). */
  async saveControl(input: unknown): Promise<ServiceResult<LessonControl | null>> {
    const parsed = parseOrFail(saveLessonControlSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("saveLessonControl");
    if (denied) return fail(denied);
    const f: SaveLessonControlInput = parsed.data;

    let value: unknown = null;
    if (f.value) {
      try {
        value = JSON.parse(f.value) as unknown;
      } catch {
        value = f.value; // plain string value
      }
    }

    const { data, error } = await this.ctx.db.rpc<LessonControl | null>("save_lesson_control", {
      p_class: f.classId,
      p_key: f.key,
      p_value: JSON.stringify(value),
    });
    if (error) return fail(error);
    return ok(data);
  }
}
