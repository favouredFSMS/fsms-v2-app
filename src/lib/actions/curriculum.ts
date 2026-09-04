"use server";

import { revalidatePath } from "next/cache";
import { requireDbContext } from "@/lib/db/context";
import { CurriculumRepository } from "@/lib/db/repos/curriculum";
import type { ServiceResult } from "@/lib/db/errors";

/**
 * FSMS V2 — curriculum & learning server actions (Phase 18).
 */

export type CurriculumActionState = { ok: boolean; message?: string };

function toState<T>(res: ServiceResult<T>): CurriculumActionState {
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

function optionalNum(formData: FormData, key: string): number | null {
  const v = field(formData, key);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function bool(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

/**
 * Author a spine chain in one go: Programme → Unit → Lesson → Objective.
 * An existing programme may be reused; unit/lesson are always created fresh.
 */
export async function authorCurriculumAction(
  _prev: CurriculumActionState | null,
  formData: FormData,
): Promise<CurriculumActionState> {
  try {
    const ctx = await requireDbContext();
    const repo = new CurriculumRepository(ctx);

    let programmeId = field(formData, "programmeId");

    if (!programmeId) {
      const pr = await repo.saveProgramme({
        name: field(formData, "programmeName"),
        code: field(formData, "programmeCode"),
        type: field(formData, "programmeType"),
        standard: bool(formData, "programmeStandard"),
      });
      if (!pr.ok) return toState(pr);
      if (!pr.data) return { ok: false, message: "Programme was not created (denied)" };
      programmeId = pr.data.id;
    }

    const un = await repo.saveUnit({
      programmeId,
      title: field(formData, "unitTitle"),
      code: field(formData, "unitCode"),
      no: optionalInt(formData, "unitNo"),
    });
    if (!un.ok) return toState(un);
    if (!un.data) return { ok: false, message: "Unit was not created (denied)" };

    const le = await repo.saveLesson({
      unitId: un.data.id,
      title: field(formData, "lessonTitle"),
      code: field(formData, "lessonCode"),
      no: optionalInt(formData, "lessonNo"),
    });
    if (!le.ok) return toState(le);
    if (!le.data) return { ok: false, message: "Lesson was not created (denied)" };

    const objectiveText = field(formData, "objectiveText");
    if (objectiveText) {
      const ob = await repo.saveObjective({
        lessonId: le.data.id,
        text: objectiveText,
        code: field(formData, "objectiveCode"),
        cefr: field(formData, "objectiveCefr"),
      });
      if (!ob.ok) return toState(ob);
      if (!ob.data) return { ok: false, message: "Objective was not created (denied)" };
    }

    revalidatePath("/curriculum");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to author curriculum node" };
  }
}

export async function saveTopicAction(
  _prev: CurriculumActionState | null,
  formData: FormData,
): Promise<CurriculumActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new CurriculumRepository(ctx).saveTopic({
      title: field(formData, "title"),
      levelCode: field(formData, "levelCode"),
      courseSection: field(formData, "courseSection"),
      published: bool(formData, "published"),
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Topic was not saved (denied)" };
    revalidatePath("/curriculum");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to save topic" };
  }
}

export async function saveEvidenceAction(
  _prev: CurriculumActionState | null,
  formData: FormData,
): Promise<CurriculumActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new CurriculumRepository(ctx).saveEvidence({
      studentId: field(formData, "studentId"),
      targetId: field(formData, "targetId"),
      topicId: field(formData, "topicId"),
      lessonId: null,
      score: optionalNum(formData, "score"),
      rating: field(formData, "rating"),
      quality: field(formData, "quality"),
      note: field(formData, "note"),
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Evidence was not recorded (denied)" };
    revalidatePath("/curriculum");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to record evidence" };
  }
}

export async function importCurriculumAction(
  _prev: CurriculumActionState | null,
  formData: FormData,
): Promise<CurriculumActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new CurriculumRepository(ctx).importCurriculum({
      programmeId: field(formData, "programmeId"),
      title: field(formData, "title"),
      publisher: field(formData, "publisher"),
      payload: field(formData, "payload"),
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Curriculum was not imported (denied)" };
    revalidatePath("/curriculum");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to import curriculum" };
  }
}

export async function publishCurriculumAction(
  _prev: CurriculumActionState | null,
  formData: FormData,
): Promise<CurriculumActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new CurriculumRepository(ctx).publishCurriculum({
      curriculumId: field(formData, "curriculumId"),
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Curriculum was not published (denied)" };
    revalidatePath("/curriculum");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to publish curriculum" };
  }
}

export async function archiveCurriculumAction(
  _prev: CurriculumActionState | null,
  formData: FormData,
): Promise<CurriculumActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new CurriculumRepository(ctx).archiveCurriculum({
      curriculumId: field(formData, "curriculumId"),
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Curriculum was not archived (denied)" };
    revalidatePath("/curriculum");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to archive curriculum" };
  }
}

/** Generic one-arg decision action factory (submit review / unpublish / delete / restore). */
function decisionAction(fn: "submitReview" | "unpublishCurriculum" | "deleteCurriculum" | "restoreCurriculum") {
  return async (_prev: CurriculumActionState | null, formData: FormData): Promise<CurriculumActionState> => {
    try {
      const ctx = await requireDbContext();
      const res = await new CurriculumRepository(ctx)[fn]({
        curriculumId: field(formData, "curriculumId"),
      });
      if (!res.ok) return toState(res);
      if (!res.data) return { ok: false, message: "Action was not applied (denied)" };
      revalidatePath("/curriculum");
      return { ok: true };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : "Action failed" };
    }
  };
}

export const submitCurriculumReviewAction = decisionAction("submitReview");
export const unpublishCurriculumAction = decisionAction("unpublishCurriculum");
export const deleteCurriculumAction = decisionAction("deleteCurriculum");
export const restoreCurriculumAction = decisionAction("restoreCurriculum");

export async function duplicateCurriculumAction(
  _prev: CurriculumActionState | null,
  formData: FormData,
): Promise<CurriculumActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new CurriculumRepository(ctx).duplicateCurriculum({
      curriculumId: field(formData, "curriculumId"),
      title: field(formData, "title"),
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Curriculum was not duplicated (denied)" };
    revalidatePath("/curriculum");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to duplicate curriculum" };
  }
}

export async function permanentlyDeleteCurriculumAction(
  _prev: CurriculumActionState | null,
  formData: FormData,
): Promise<CurriculumActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new CurriculumRepository(ctx).permanentlyDeleteCurriculum({
      curriculumId: field(formData, "curriculumId"),
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Curriculum was not permanently deleted (denied or not soft-deleted)" };
    revalidatePath("/curriculum");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to permanently delete curriculum" };
  }
}

export async function assignCurriculumAction(
  _prev: CurriculumActionState | null,
  formData: FormData,
): Promise<CurriculumActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new CurriculumRepository(ctx).assignCurriculum({
      curriculumId: field(formData, "curriculumId"),
      classId: field(formData, "classId"),
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Curriculum was not assigned (denied or not published)" };
    revalidatePath("/curriculum");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to assign curriculum" };
  }
}
