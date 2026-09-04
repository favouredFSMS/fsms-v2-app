"use server";

import { revalidatePath } from "next/cache";
import { requireDbContext } from "@/lib/db/context";
import { ClassRepository } from "@/lib/db/repos/classes";
import { AcademicRepository } from "@/lib/db/repos/academic";
import type { ServiceResult } from "@/lib/db/errors";

/**
 * FSMS V2 — academic-structure server actions (Phase 13).
 * Every mutation goes through a repository (RBAC pre-check + RLS).
 */

export type AcademicActionState = { ok: boolean; message?: string };

function toState<T>(res: ServiceResult<T>): AcademicActionState {
  if (res.ok) return { ok: true };
  return { ok: false, message: res.error.message };
}

function field(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

export async function createClassAction(
  _prev: AcademicActionState | null,
  formData: FormData,
): Promise<AcademicActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new ClassRepository(ctx).create({
      name: field(formData, "name"),
      levelCode: field(formData, "levelCode"),
      classType: field(formData, "classType"),
      learnerType: field(formData, "learnerType"),
      room: field(formData, "room"),
      academicYearId: field(formData, "academicYearId"),
      termId: field(formData, "termId"),
    });
    if (!res.ok) return toState(res);
    revalidatePath("/classes");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to create class" };
  }
}

export async function createSubjectAction(
  _prev: AcademicActionState | null,
  formData: FormData,
): Promise<AcademicActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new AcademicRepository(ctx).createSubject({ name: field(formData, "name") });
    if (!res.ok) return toState(res);
    revalidatePath("/classes");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to create subject" };
  }
}

export async function createYearAction(
  _prev: AcademicActionState | null,
  formData: FormData,
): Promise<AcademicActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new AcademicRepository(ctx).createYear({
      name: field(formData, "name"),
      startsOn: field(formData, "startsOn"),
      endsOn: field(formData, "endsOn"),
    });
    if (!res.ok) return toState(res);
    revalidatePath("/classes");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to create academic year" };
  }
}

export async function createTermAction(
  _prev: AcademicActionState | null,
  formData: FormData,
): Promise<AcademicActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new AcademicRepository(ctx).createTerm({
      academicYearId: field(formData, "academicYearId"),
      name: field(formData, "name"),
      startsOn: field(formData, "startsOn"),
      endsOn: field(formData, "endsOn"),
    });
    if (!res.ok) return toState(res);
    revalidatePath("/classes");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to create term" };
  }
}

export async function assignTeacherAction(
  _prev: AcademicActionState | null,
  formData: FormData,
): Promise<AcademicActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new ClassRepository(ctx).assignTeacher({
      classId: field(formData, "classId"),
      userId: field(formData, "userId"),
      primary: formData.get("primary") === "on",
    });
    if (!res.ok) return toState(res);
    revalidatePath("/classes/[id]", "page");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to assign teacher" };
  }
}

export async function removeTeacherAction(
  _prev: AcademicActionState | null,
  formData: FormData,
): Promise<AcademicActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new ClassRepository(ctx).removeTeacher({
      classId: field(formData, "classId"),
      userId: field(formData, "userId"),
    });
    if (!res.ok) return toState(res);
    revalidatePath("/classes/[id]", "page");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to remove teacher" };
  }
}

export async function enrolStudentAction(
  _prev: AcademicActionState | null,
  formData: FormData,
): Promise<AcademicActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new ClassRepository(ctx).enrolStudent({
      studentId: field(formData, "studentId"),
      classId: field(formData, "classId"),
    });
    if (!res.ok) return toState(res);
    revalidatePath("/classes/[id]", "page");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to enrol student" };
  }
}

export async function setEnrolmentStatusAction(
  _prev: AcademicActionState | null,
  formData: FormData,
): Promise<AcademicActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new ClassRepository(ctx).setEnrolmentStatus({
      enrolmentId: field(formData, "enrolmentId"),
      status: field(formData, "status"),
    });
    if (!res.ok) return toState(res);
    revalidatePath("/classes/[id]", "page");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to update enrolment" };
  }
}
