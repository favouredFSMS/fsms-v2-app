"use server";

import { revalidatePath } from "next/cache";
import { requireDbContext } from "@/lib/db/context";
import { LessonRepository } from "@/lib/db/repos/lessons";
import type { ServiceResult } from "@/lib/db/errors";

/**
 * FSMS V2 — lessons server actions (Phase 16).
 */

export type LessonActionState = { ok: boolean; message?: string };

function toState<T>(res: ServiceResult<T>): LessonActionState {
  if (res.ok) return { ok: true };
  return { ok: false, message: res.error.message };
}

function field(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

function optionalInt(formData: FormData, key: string): number | null {
  const v = field(formData, key);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function saveLessonLogAction(
  _prev: LessonActionState | null,
  formData: FormData,
): Promise<LessonActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new LessonRepository(ctx).saveLog({
      classId: field(formData, "classId"),
      date: field(formData, "date"),
      lessonNo: optionalInt(formData, "lessonNo"),
      topic: field(formData, "topic"),
      topicIds: null,
      participation: field(formData, "participation"),
      teacherNote: field(formData, "teacherNote"),
      durationMin: optionalInt(formData, "durationMin"),
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Lesson record was not saved (denied)" };
    revalidatePath("/lessons");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to save lesson record" };
  }
}

export async function saveLessonPlanAction(
  _prev: LessonActionState | null,
  formData: FormData,
): Promise<LessonActionState> {
  try {
    const ctx = await requireDbContext();
    const planText = field(formData, "plan");
    const res = await new LessonRepository(ctx).savePlan({
      classId: field(formData, "classId"),
      lessonId: field(formData, "lessonId"),
      plan: planText ? JSON.stringify({ text: planText }) : null,
      source: field(formData, "source"),
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Plan was not saved (denied)" };
    revalidatePath("/lessons");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to save lesson plan" };
  }
}

export async function requestLessonChangeAction(
  _prev: LessonActionState | null,
  formData: FormData,
): Promise<LessonActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new LessonRepository(ctx).requestChange({
      classId: field(formData, "classId"),
      fromDate: field(formData, "fromDate"),
      toDate: field(formData, "toDate"),
      reason: field(formData, "reason"),
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Change request was not accepted (denied)" };
    revalidatePath("/lessons");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to request lesson change" };
  }
}

export async function decideLessonChangeAction(
  _prev: LessonActionState | null,
  formData: FormData,
): Promise<LessonActionState> {
  try {
    const ctx = await requireDbContext();
    const decision = field(formData, "decision") as "approved" | "declined" | null;
    if (decision !== "approved" && decision !== "declined") {
      return { ok: false, message: "Pick a decision" };
    }
    const res = await new LessonRepository(ctx).decideChange({
      changeId: field(formData, "changeId"),
      decision,
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Decision was not recorded (denied)" };
    revalidatePath("/lessons");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to record decision" };
  }
}

export async function saveLessonControlAction(
  _prev: LessonActionState | null,
  formData: FormData,
): Promise<LessonActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new LessonRepository(ctx).saveControl({
      classId: field(formData, "classId"),
      key: field(formData, "key"),
      value: field(formData, "value"),
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Control was not saved (denied)" };
    revalidatePath("/lessons");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to save lesson control" };
  }
}

export async function deleteLessonLogAction(
  _prev: LessonActionState | null,
  formData: FormData,
): Promise<LessonActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new LessonRepository(ctx).deleteLog({ logId: field(formData, "logId") ?? "" });
    if (!res.ok) return toState(res);
    revalidatePath("/lessons");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to remove lesson record" };
  }
}
