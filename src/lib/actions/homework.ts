"use server";

import { revalidatePath } from "next/cache";
import { requireDbContext } from "@/lib/db/context";
import { HomeworkRepository } from "@/lib/db/repos/homework";
import type { ServiceResult } from "@/lib/db/errors";

/**
 * FSMS V2 — homework server actions (Phase 15).
 */

export type HomeworkActionState = { ok: boolean; created?: number; message?: string };

function toState<T>(res: ServiceResult<T>): HomeworkActionState {
  if (res.ok) return { ok: true };
  return { ok: false, message: res.error.message };
}

function field(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

export async function assignHomeworkAction(
  _prev: HomeworkActionState | null,
  formData: FormData,
): Promise<HomeworkActionState> {
  try {
    const classId = field(formData, "classId");
    const date = field(formData, "date");
    const rawIds = formData.get("studentIds");
    if (!classId || !date || typeof rawIds !== "string") {
      return { ok: false, message: "Missing class, date or roster" };
    }
    let studentIds: unknown;
    try {
      studentIds = JSON.parse(rawIds);
    } catch {
      return { ok: false, message: "Roster payload is not valid JSON" };
    }

    const ctx = await requireDbContext();
    const res = await new HomeworkRepository(ctx).assign({
      classId,
      date,
      title: field(formData, "title"),
      dueDate: field(formData, "dueDate"),
      note: field(formData, "note"),
      studentIds,
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Homework could not be assigned (denied)" };
    revalidatePath("/homework");
    return { ok: true, created: res.data.created };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to assign homework" };
  }
}

export async function submitHomeworkAction(
  _prev: HomeworkActionState | null,
  formData: FormData,
): Promise<HomeworkActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new HomeworkRepository(ctx).submit({
      homeworkId: field(formData, "homeworkId"),
      note: field(formData, "note"),
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Submission was not accepted" };
    revalidatePath("/homework");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to submit homework" };
  }
}

export async function gradeHomeworkAction(
  _prev: HomeworkActionState | null,
  formData: FormData,
): Promise<HomeworkActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new HomeworkRepository(ctx).grade({
      homeworkId: field(formData, "homeworkId"),
      score: field(formData, "score"),
      feedback: field(formData, "feedback"),
      status: (field(formData, "status") ?? "graded") as "graded" | "missing" | "overdue" | "assigned",
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Grading was not accepted" };
    revalidatePath("/homework");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to grade homework" };
  }
}
