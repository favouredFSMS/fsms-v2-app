"use server";

import { revalidatePath } from "next/cache";
import { requireDbContext } from "@/lib/db/context";
import { AttendanceRepository } from "@/lib/db/repos/attendance";
import type { ServiceResult } from "@/lib/db/errors";

/**
 * FSMS V2 — attendance server actions (Phase 14).
 */

export type AttendanceActionState = { ok: boolean; saved?: number; message?: string };

function toState<T>(res: ServiceResult<T>): AttendanceActionState {
  if (res.ok) return { ok: true, saved: 0 };
  return { ok: false, message: res.error.message };
}

/**
 * Bulk save. The client sheet serializes its marks into the hidden "marks"
 * field as JSON; the action validates that JSON against the shared schema.
 */
export async function saveAttendanceAction(
  _prev: AttendanceActionState | null,
  formData: FormData,
): Promise<AttendanceActionState> {
  try {
    const classId = formData.get("classId");
    const date = formData.get("date");
    const rawMarks = formData.get("marks");
    if (typeof classId !== "string" || typeof date !== "string" || typeof rawMarks !== "string") {
      return { ok: false, message: "Missing class, date or marks" };
    }

    let marks: unknown;
    try {
      marks = JSON.parse(rawMarks);
    } catch {
      return { ok: false, message: "Marks payload is not valid JSON" };
    }

    const ctx = await requireDbContext();
    const res = await new AttendanceRepository(ctx).save({ classId, date, marks });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Attendance could not be saved (denied)" };

    revalidatePath("/attendance");
    return { ok: true, saved: res.data.saved };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to save attendance" };
  }
}
