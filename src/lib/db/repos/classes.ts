import { Repository } from "../repository";
import { parseOrFail } from "../validate";
import { ok, fail, ServiceError, type ServiceResult } from "../errors";
import type { Page } from "../pagination";
import {
  classSearchSchema,
  classCreateSchema,
  assignTeacherSchema,
  enrolStudentSchema,
  enrolmentStatusSchema,
  type ClassSearchFilters,
  type ClassCreateInput,
  type AssignTeacherInput,
  type EnrolStudentInput,
  type EnrolmentStatusInput,
} from "@/lib/schemas/academic";

/**
 * FSMS V2 — ClassRepository (Phase 13 academic structure).
 *
 * Reads are one-RPC round trips (visibility-scoped by fsms.can_see_class);
 * writes are office/leadership-gated inside the RPCs and pre-checked here
 * against the V101 catalog. RLS remains the final enforcement layer.
 */

export interface ClassTeacher {
  id: string;
  name: string | null;
  is_primary: boolean;
}

export interface ClassSummary {
  id: string;
  name: string | null;
  level_code: string | null;
  level_label: string | null;
  status: string | null;
  class_type: string | null;
  learner_type: string | null;
  room: string | null;
  academic_year_id: string | null;
  term_id: string | null;
  students: number;
  teachers: ClassTeacher[];
}

interface ClassSearchRpcResult {
  rows: Array<Omit<ClassSummary, "teachers"> & { teachers: ClassTeacher[] | null }>;
  total: number;
  next_cursor: string | null;
}

export interface ClassDetail {
  class: {
    id: string;
    name: string | null;
    level_code: string | null;
    status: string | null;
    class_type: string | null;
    learner_type: string | null;
    room: string | null;
    schedule: string | null;
    start_time: string | null;
    end_time: string | null;
    days: unknown | null;
    recurrence: string | null;
    fee: unknown | null;
    fee_currency: string | null;
    academic_year_id: string | null;
    term_id: string | null;
    created_at: string | null;
  } | null;
  day_times: Array<{ day_of_week: number; start_time: string | null; end_time: string | null }>;
  teachers: Array<ClassTeacher & { assigned_at: string | null }>;
  students: Array<{
    id: string;
    enrolment_id: string;
    name: string | null;
    student_no: string | null;
    level_code: string | null;
    status: string | null;
    enrolled_at: string | null;
  }>;
}

export class ClassRepository extends Repository {
  /** Visibility-scoped, searchable, keyset-paginated class listing. */
  async search(input: unknown): Promise<ServiceResult<Page<ClassSummary>>> {
    const parsed = parseOrFail(classSearchSchema, input);
    if (!parsed.ok) return parsed;
    const f: ClassSearchFilters = parsed.data;

    const { data, error } = await this.ctx.db.rpc<ClassSearchRpcResult>("class_search", {
      p_search: f.search ?? null,
      p_level: f.level ?? null,
      p_status: f.status ?? null,
      p_page_size: f.pageSize,
      p_cursor: f.cursor ?? null,
    });
    if (error) return fail(error);

    const res = data ?? { rows: [], total: 0, next_cursor: null };
    return ok({
      items: res.rows.map((r) => ({ ...r, teachers: r.teachers ?? [] })),
      total: res.total,
      nextCursor: res.next_cursor,
    });
  }

  /** Class profile (fields + day times + teachers + roster). null = not visible. */
  async detail(id: string): Promise<ServiceResult<ClassDetail | null>> {
    if (!id) return ok(null);
    const { data, error } = await this.ctx.db.rpc<ClassDetail | null>("class_detail", {
      p_class: id,
    });
    if (error) return fail(error);
    return ok(data ?? null);
  }

  /** Create a class in the caller's school (saveClass). */
  async create(input: unknown): Promise<ServiceResult<ClassSummary>> {
    const parsed = parseOrFail(classCreateSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("saveClass");
    if (denied) return fail(denied);
    const f: ClassCreateInput = parsed.data;

    const { data, error } = await this.ctx.db.rpc<Omit<ClassSummary, "students" | "teachers">>(
      "create_class",
      {
        p_name: f.name,
        p_level_code: f.levelCode ?? null,
        p_class_type: f.classType ?? null,
        p_learner_type: f.learnerType ?? null,
        p_room: f.room ?? null,
        p_academic_year: f.academicYearId ?? null,
        p_term: f.termId ?? null,
      },
    );
    if (error) return fail(error);
    if (!data) return fail(new ServiceError("not_found", 404, "Class could not be created"));
    return ok({ ...data, students: 0, teachers: [] });
  }

  /** Assign (or re-assign) a teacher to a class (saveTeacherAssignments). */
  async assignTeacher(input: unknown): Promise<ServiceResult<{ class_id: string; user_id: string; is_primary: boolean } | null>> {
    const parsed = parseOrFail(assignTeacherSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("saveTeacherAssignments");
    if (denied) return fail(denied);
    const f: AssignTeacherInput = parsed.data;

    const { data, error } = await this.ctx.db.rpc<{ class_id: string; user_id: string; is_primary: boolean } | null>(
      "assign_teacher",
      { p_class: f.classId, p_user: f.userId, p_primary: f.primary },
    );
    if (error) return fail(error);
    return ok(data);
  }

  /** Remove a teacher from a class (saveTeacherAssignments). */
  async removeTeacher(input: unknown): Promise<ServiceResult<{ class_id: string; user_id: string; removed: boolean } | null>> {
    const parsed = parseOrFail(assignTeacherSchema.pick({ classId: true, userId: true }), input);
    if (!parsed.ok) return parsed;
    const denied = this.can("saveTeacherAssignments");
    if (denied) return fail(denied);

    const { data, error } = await this.ctx.db.rpc<{ class_id: string; user_id: string; removed: boolean } | null>(
      "remove_teacher",
      { p_class: parsed.data.classId, p_user: parsed.data.userId },
    );
    if (error) return fail(error);
    return ok(data);
  }

  /** Enrol a student into a class, idempotently (enrolStudent). */
  async enrolStudent(input: unknown): Promise<ServiceResult<{ id: string; student_id: string; class_id: string; status: string } | null>> {
    const parsed = parseOrFail(enrolStudentSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("enrolStudent");
    if (denied) return fail(denied);
    const f: EnrolStudentInput = parsed.data;

    const { data, error } = await this.ctx.db.rpc<{ id: string; student_id: string; class_id: string; status: string } | null>(
      "enrol_student",
      { p_student: f.studentId, p_class: f.classId },
    );
    if (error) return fail(error);
    return ok(data);
  }

  /** Change an enrolment's status (enrolStudent). */
  async setEnrolmentStatus(input: unknown): Promise<ServiceResult<{ id: string; status: string } | null>> {
    const parsed = parseOrFail(enrolmentStatusSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("enrolStudent");
    if (denied) return fail(denied);
    const f: EnrolmentStatusInput = parsed.data;

    const { data, error } = await this.ctx.db.rpc<{ id: string; status: string } | null>(
      "set_enrolment_status",
      { p_enrolment: f.enrolmentId, p_status: f.status },
    );
    if (error) return fail(error);
    return ok(data);
  }
}
