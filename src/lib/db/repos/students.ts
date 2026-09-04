import { Repository } from "../repository";
import { parseOrFail } from "../validate";
import { ok, fail, type ServiceResult } from "../errors";
import { randomUUID } from "node:crypto";
import type { Page } from "../pagination";
import {
  studentCreateSchema,
  studentSearchSchema,
  type StudentSearchFilters,
} from "@/lib/schemas/students";

/**
 * FSMS V2 — StudentRepository (Phase 10 worked example).
 *
 * Demonstrates every DAL concern in one aggregate:
 *   - validation      → shared Zod schemas;
 *   - optimized query → one rpc() round trip (school+visibility scoped, keyset
 *                       paginated, ILIKE search) instead of N+1 client loops;
 *   - pagination      → opaque keyset cursor passed straight through;
 *   - authorization   → RBAC pre-check + RLS on the actual query;
 *   - error handling  → typed ServiceResult envelope.
 */

export interface StudentSummary {
  id: string;
  name: string | null;
  student_no: string | null;
  level_code: string | null;
  status: string | null;
}

interface StudentSearchRpcResult {
  rows: Array<{
    id: string;
    name: string | null;
    student_no: string | null;
    level_code: string | null;
    status: string | null;
  }>;
  total: number;
  next_cursor: string | null;
}

export interface StudentDetailParent {
  id: string;
  name: string | null;
  relationship: string | null;
  phone: string | null;
  email: string | null;
}

export interface StudentDetailClass {
  id: string;
  name: string | null;
  level_code: string | null;
  primary_teacher: string | null;
}

export interface StudentDetailSummary {
  attendance_present: number;
  attendance_late: number;
  attendance_absent: number;
  homework_total: number;
  homework_graded: number;
  assessments: number;
  evidence: number;
}

export interface StudentDetail {
  student: {
    id: string;
    name: string | null;
    student_no: string | null;
    legacy_id: string | null;
    level_code: string | null;
    status: string | null;
    gender: string | null;
    dob: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    joined_at: string | null;
    learner_type: string | null;
    notes: string | null;
  } | null;
  parents: StudentDetailParent[];
  classes: StudentDetailClass[];
  summary: StudentDetailSummary;
}

export class StudentRepository extends Repository {
  /** School+visibility-scoped, searchable, keyset-paginated listing. */
  async search(input: unknown): Promise<ServiceResult<Page<StudentSummary>>> {
    const parsed = parseOrFail(studentSearchSchema, input);
    if (!parsed.ok) return parsed;
    const f: StudentSearchFilters = parsed.data;

    const { data, error } = await this.ctx.db.rpc<StudentSearchRpcResult>(
      "student_search",
      {
        p_search: f.search ?? null,
        p_level: f.level ?? null,
        p_status: f.status ?? null,
        p_page_size: f.pageSize,
        p_cursor: f.cursor ?? null,
      },
    );
    if (error) return fail(error);

    const res = data ?? { rows: [], total: 0, next_cursor: null };
    return ok({
      items: res.rows.map((r) => ({
        id: r.id,
        name: r.name,
        student_no: r.student_no,
        level_code: r.level_code,
        status: r.status,
      })),
      total: res.total,
      nextCursor: res.next_cursor,
    });
  }

  /** Single student by id. RLS scopes visibility: null = not visible/not found. */
  async getById(id: string): Promise<ServiceResult<StudentSummary | null>> {
    if (!id) return ok(null);
    return this.readOne<StudentSummary>({
      table: "students",
      columns: "id, name, student_no, level_code, status",
      where: [{ op: "eq", column: "id", value: id }],
    });
  }

  /** Aggregated student profile (student + parents + classes + summary). */
  async detail(id: string): Promise<ServiceResult<StudentDetail | null>> {
    if (!id) return ok(null);
    const { data, error } = await this.ctx.db.rpc<StudentDetail | null>("student_detail", {
      p_student: id,
    });
    if (error) return fail(error);
    return ok(data ?? null);
  }

  /** Create a student in the caller's school (RBAC + RLS enforced). */
  async create(input: unknown): Promise<ServiceResult<StudentSummary>> {
    const parsed = parseOrFail(studentCreateSchema, input);
    if (!parsed.ok) return parsed;

    // Generate the id here rather than relying on INSERT … RETURNING: on this
    // RLS-protected table the read policy (fsms.can_see_student) cannot see the
    // brand-new row inside RETURNING, so we insert plainly and read back below.
    const id = randomUUID();
    const inserted = await this.insertRow(
      "students",
      {
        id,
        ...parsed.data,
        school_id: this.ctx.profile.school_id,
        user_id: null,
      },
      "saveStudent",
    );
    if (!inserted.ok) return inserted;

    // Read back through the normal read path (re-applies the read policy).
    const readBack = await this.getById(id);
    if (!readBack.ok) return readBack;
    if (readBack.data) return ok(readBack.data);

    // The caller cannot see their own insert (e.g. an unlinked student), but
    // the row WAS created — return the fields we know rather than failing.
    return ok({
      id,
      name: parsed.data.name,
      student_no: parsed.data.student_no ?? null,
      level_code: parsed.data.level_code ?? null,
      status: "active",
    });
  }
}
