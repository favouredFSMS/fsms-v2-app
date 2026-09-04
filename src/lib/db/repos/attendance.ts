import { Repository } from "../repository";
import { parseOrFail } from "../validate";
import { ok, fail, type ServiceResult } from "../errors";
import type { Page } from "../pagination";
import {
  attendanceGridSchema,
  saveAttendanceSchema,
  attendanceHistorySchema,
  attendanceStatsSchema,
  myAttendanceSchema,
  type AttendanceGridInput,
  type SaveAttendanceInput,
  type AttendanceHistoryFilters,
  type AttendanceStatsInput,
} from "@/lib/schemas/attendance";

/**
 * FSMS V2 — AttendanceRepository (Phase 14).
 *
 * Reads are one-RPC round trips (visibility-scoped: staff grid/stats/history;
 * family/student my_attendance). The bulk save is a single upsert RPC so a
 * teacher marks a whole class in one round trip.
 */

export interface AttendanceGridRow {
  id: string;
  name: string | null;
  student_no: string | null;
  status: "present" | "absent" | "late" | null;
  minutes_late: number | null;
  note: string | null;
  taken_by: string | null;
  taken_at: string | null;
}

export interface AttendanceGrid {
  class: { id: string; name: string | null } | null;
  date: string;
  students: AttendanceGridRow[];
}

export interface AttendanceRecord {
  id: string;
  date: string;
  class_id: string;
  class_name: string | null;
  student_id: string;
  student_name: string | null;
  student_no: string | null;
  status: string;
  minutes_late: number;
  note: string | null;
  taken_by: string | null;
  taken_at: string | null;
}

export interface AttendanceStats {
  class: { id: string; name: string | null } | null;
  students: Array<{
    id: string;
    name: string | null;
    present: number;
    absent: number;
    late: number;
    rate: number | null;
  }>;
}

export interface MyAttendance {
  student: { id: string; name: string | null } | null;
  totals: { present: number; absent: number; late: number; rate: number | null };
  recent: Array<{
    date: string;
    class_name: string | null;
    status: string;
    minutes_late: number | null;
    note: string | null;
  }>;
  by_class: Array<{
    class_id: string;
    class_name: string | null;
    present: number;
    absent: number;
    late: number;
  }>;
}

export class AttendanceRepository extends Repository {
  /** Staff marking sheet (roster + existing marks). null for non-staff/denied. */
  async grid(input: unknown): Promise<ServiceResult<AttendanceGrid | null>> {
    const parsed = parseOrFail(attendanceGridSchema, input);
    if (!parsed.ok) return parsed;
    const f: AttendanceGridInput = parsed.data;

    const { data, error } = await this.ctx.db.rpc<AttendanceGrid | null>("attendance_grid", {
      p_class: f.classId,
      p_date: f.date,
    });
    if (error) return fail(error);
    return ok(data ?? null);
  }

  /** Bulk upsert a whole class/date (saveAttendance). */
  async save(input: unknown): Promise<ServiceResult<{ saved: number; rows: unknown[] } | null>> {
    const parsed = parseOrFail(saveAttendanceSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("saveAttendance");
    if (denied) return fail(denied);
    const f: SaveAttendanceInput = parsed.data;

    // JSON.stringify: the adapter passes this as a text parameter which the
    // jsonb-typed RPC argument coerces (a raw JS array would be rendered as a
    // PostgreSQL array literal and fail jsonb parsing).
    const marksJson = JSON.stringify(
      f.marks.map((m) => ({
        student_id: m.studentId,
        status: m.status,
        minutes_late: m.minutesLate ?? null,
        note: m.note ?? null,
      })),
    );

    const { data, error } = await this.ctx.db.rpc<{ saved: number; rows: unknown[] } | null>(
      "save_attendance",
      { p_class: f.classId, p_date: f.date, p_marks: marksJson },
    );
    if (error) return fail(error);
    return ok(data);
  }

  /** Paginated records (most recent first), visibility-scoped. */
  async history(input: unknown): Promise<ServiceResult<Page<AttendanceRecord>>> {
    const parsed = parseOrFail(attendanceHistorySchema, input);
    if (!parsed.ok) return parsed;
    const f: AttendanceHistoryFilters = parsed.data;

    const { data, error } = await this.ctx.db.rpc<{ rows: AttendanceRecord[]; total: number; next_cursor: string | null }>(
      "attendance_history",
      {
        p_class: f.classId ?? null,
        p_student: f.studentId ?? null,
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

  /** Per-student aggregates for a class (staff). null for non-staff. */
  async stats(input: unknown): Promise<ServiceResult<AttendanceStats | null>> {
    const parsed = parseOrFail(attendanceStatsSchema, input);
    if (!parsed.ok) return parsed;
    const f: AttendanceStatsInput = parsed.data;

    const { data, error } = await this.ctx.db.rpc<AttendanceStats | null>("attendance_stats", {
      p_class: f.classId,
      p_from: f.from ?? null,
      p_to: f.to ?? null,
    });
    if (error) return fail(error);
    return ok(data ?? null);
  }

  /** Family/student summary for one visible student. */
  async myAttendance(studentId: string): Promise<ServiceResult<MyAttendance | null>> {
    const parsed = parseOrFail(myAttendanceSchema, { studentId });
    if (!parsed.ok) return parsed;

    const { data, error } = await this.ctx.db.rpc<MyAttendance | null>("my_attendance", {
      p_student: parsed.data.studentId,
    });
    if (error) return fail(error);
    return ok(data ?? null);
  }
}
