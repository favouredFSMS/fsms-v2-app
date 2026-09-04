"use server";
import { translate } from "@/i18n/server";

import { revalidatePath } from "next/cache";
import { requireDbContext } from "@/lib/db/context";
import { StudentRepository } from "@/lib/db/repos/students";
import { ParentRepository } from "@/lib/db/repos/parents";
import { UserRepository } from "@/lib/db/repos/users";
import type { ServiceResult } from "@/lib/db/errors";

/**
 * FSMS V2 — people-management server actions (Phase 12).
 * Every mutation goes through a repository (RBAC pre-check + RLS), never raw
 * database access. Returns a plain, serializable state for useActionState.
 */

export type PeopleActionState = { ok: boolean; message?: string };

function toState<T>(res: ServiceResult<T>): PeopleActionState {
  if (res.ok) return { ok: true };
  return { ok: false, message: res.error.message };
}

function field(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

export async function createStudentAction(
  _prev: PeopleActionState | null,
  formData: FormData,
): Promise<PeopleActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new StudentRepository(ctx).create({
      name: field(formData, "name"),
      student_no: field(formData, "student_no"),
      level_code: field(formData, "level_code"),
    });
    if (!res.ok) return toState(res);
    revalidatePath("/students");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : await translate("actions.peopleCreateStudentFailed") };
  }
}

export async function createParentAction(
  _prev: PeopleActionState | null,
  formData: FormData,
): Promise<PeopleActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new ParentRepository(ctx).create({
      name: field(formData, "name"),
      phone: field(formData, "phone"),
      email: field(formData, "email"),
    });
    if (!res.ok) return toState(res);
    revalidatePath("/parents");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : await translate("actions.peopleCreateParentFailed") };
  }
}

export async function linkParentAction(
  _prev: PeopleActionState | null,
  formData: FormData,
): Promise<PeopleActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new ParentRepository(ctx).link({
      studentId: field(formData, "studentId"),
      parentId: field(formData, "parentId"),
      relationship: field(formData, "relationship") ?? "parent",
    });
    if (!res.ok) return toState(res);
    revalidatePath("/students/[id]", "page");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : await translate("actions.peopleLinkParentFailed") };
  }
}

export async function updateUserAction(
  _prev: PeopleActionState | null,
  formData: FormData,
): Promise<PeopleActionState> {
  try {
    const ctx = await requireDbContext();
    const repo = new UserRepository(ctx);
    const userId = field(formData, "userId");
    const status = field(formData, "status");
    const roleKey = field(formData, "roleKey");
    if (!userId) return { ok: false, message: await translate("actions.peopleMissingUserId") };

    if (status) {
      const res = await repo.setStatus({ userId, status });
      if (!res.ok) return toState(res);
    }
    if (roleKey) {
      const res = await repo.assignRole({ userId, roleKey });
      if (!res.ok) return toState(res);
    }
    revalidatePath("/people");
    revalidatePath("/teachers");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : await translate("actions.peopleUpdateUserFailed") };
  }
}
