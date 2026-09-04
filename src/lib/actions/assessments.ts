"use server";
import { translate } from "@/i18n/server";

import { revalidatePath } from "next/cache";
import { requireDbContext } from "@/lib/db/context";
import { AssessmentRepository } from "@/lib/db/repos/assessments";
import type { ServiceResult } from "@/lib/db/errors";

/**
 * FSMS V2 — assessments server actions (Phase 17).
 */

export type AssessmentActionState = { ok: boolean; message?: string };

function toState<T>(res: ServiceResult<T>): AssessmentActionState {
  if (res.ok) return { ok: true };
  return { ok: false, message: res.error.message };
}

function field(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

function optionalNumber(formData: FormData, key: string): number | null {
  const v = field(formData, key);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function saveAssessmentAction(
  _prev: AssessmentActionState | null,
  formData: FormData,
): Promise<AssessmentActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new AssessmentRepository(ctx).save({
      studentId: field(formData, "studentId"),
      classId: field(formData, "classId"),
      date: field(formData, "date"),
      type: field(formData, "type"),
      title: field(formData, "title"),
      score: optionalNumber(formData, "score"),
      maxScore: optionalNumber(formData, "maxScore"),
      note: field(formData, "note"),
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: await translate("actions.assessmentsNotSavedDenied") };
    revalidatePath("/assessments");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : await translate("actions.assessmentsSaveFailed") };
  }
}

export async function saveAssessmentTestAction(
  _prev: AssessmentActionState | null,
  formData: FormData,
): Promise<AssessmentActionState> {
  try {
    const rawTasks = formData.get("tasks");
    const rawTypes = formData.get("types");
    let tasks: unknown;
    try {
      tasks = rawTasks ? JSON.parse(String(rawTasks)) : null;
    } catch {
      return { ok: false, message: await translate("actions.assessmentsTasksInvalidJson") };
    }
    const types = rawTypes
      ? String(rawTypes)
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : null;

    const ctx = await requireDbContext();
    const res = await new AssessmentRepository(ctx).saveTest({
      studentId: field(formData, "studentId"),
      classId: field(formData, "classId"),
      title: field(formData, "title"),
      difficulty: field(formData, "difficulty"),
      types,
      tasks,
      mode: field(formData, "mode"),
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: await translate("actions.assessmentsTestNotSavedDenied") };
    revalidatePath("/assessments");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : await translate("actions.assessmentsSaveTestFailed") };
  }
}

export async function recordAssessmentTestAction(
  _prev: AssessmentActionState | null,
  formData: FormData,
): Promise<AssessmentActionState> {
  try {
    const testId = field(formData, "testId");
    if (!testId) return { ok: false, message: await translate("actions.assessmentsPickTest") };

    const ctx = await requireDbContext();
    const repo = new AssessmentRepository(ctx);

    // Build marks against the test's own task list.
    const detail = await repo.testDetail({ testId });
    if (!detail.ok || !detail.data) return { ok: false, message: await translate("actions.assessmentsTestNotFound") };
    const total = detail.data.tasks?.length ?? 0;
    if (total === 0) return { ok: false, message: await translate("actions.assessmentsTestNoTasks") };

    const correctTasks = field(formData, "correctTasks");
    const correctSet = new Set<number>(
      (correctTasks ?? "")
        .split(",")
        .map((t) => Number(t.trim()))
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= total),
    );
    const marks = Array.from({ length: total }, (_, i) => ({
      n: i + 1,
      correct: correctSet.has(i + 1),
    }));

    const res = await repo.recordTest({ testId, marks });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: await translate("actions.assessmentsResultNotRecordedDenied") };
    revalidatePath("/assessments");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : await translate("actions.assessmentsRecordResultFailed") };
  }
}

export async function archiveAssessmentTestAction(
  _prev: AssessmentActionState | null,
  formData: FormData,
): Promise<AssessmentActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new AssessmentRepository(ctx).archiveTest({ testId: field(formData, "testId") ?? "" });
    if (!res.ok) return toState(res);
    revalidatePath("/assessments");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : await translate("actions.assessmentsArchiveFailed") };
  }
}
