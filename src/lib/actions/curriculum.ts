"use server";
import { translate } from "@/i18n/server";

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
      if (!pr.data) return { ok: false, message: await translate("actions.curriculumProgrammeNotCreatedDenied") };
      programmeId = pr.data.id;
    }

    const un = await repo.saveUnit({
      programmeId,
      title: field(formData, "unitTitle"),
      code: field(formData, "unitCode"),
      no: optionalInt(formData, "unitNo"),
    });
    if (!un.ok) return toState(un);
    if (!un.data) return { ok: false, message: await translate("actions.curriculumUnitNotCreatedDenied") };

    const le = await repo.saveLesson({
      unitId: un.data.id,
      title: field(formData, "lessonTitle"),
      code: field(formData, "lessonCode"),
      no: optionalInt(formData, "lessonNo"),
    });
    if (!le.ok) return toState(le);
    if (!le.data) return { ok: false, message: await translate("actions.curriculumLessonNotCreatedDenied") };

    const objectiveText = field(formData, "objectiveText");
    if (objectiveText) {
      const ob = await repo.saveObjective({
        lessonId: le.data.id,
        text: objectiveText,
        code: field(formData, "objectiveCode"),
        cefr: field(formData, "objectiveCefr"),
      });
      if (!ob.ok) return toState(ob);
      if (!ob.data) return { ok: false, message: await translate("actions.curriculumObjectiveNotCreatedDenied") };
    }

    revalidatePath("/curriculum");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : await translate("actions.curriculumAuthorFailed") };
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
    if (!res.data) return { ok: false, message: await translate("actions.curriculumTopicNotSavedDenied") };
    revalidatePath("/curriculum");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : await translate("actions.curriculumSaveTopicFailed") };
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
    if (!res.data) return { ok: false, message: await translate("actions.curriculumEvidenceNotRecordedDenied") };
    revalidatePath("/curriculum");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : await translate("actions.curriculumEvidenceFailed") };
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
    if (!res.data) return { ok: false, message: await translate("actions.curriculumNotImportedDenied") };
    revalidatePath("/curriculum");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : await translate("actions.curriculumImportFailed") };
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
    if (!res.data) return { ok: false, message: await translate("actions.curriculumNotPublishedDenied") };
    revalidatePath("/curriculum");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : await translate("actions.curriculumPublishFailed") };
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
    if (!res.data) return { ok: false, message: await translate("actions.curriculumNotArchivedDenied") };
    revalidatePath("/curriculum");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : await translate("actions.curriculumArchiveFailed") };
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
      if (!res.data) return { ok: false, message: await translate("actions.curriculumNotAppliedDenied") };
      revalidatePath("/curriculum");
      return { ok: true };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : await translate("actions.curriculumActionFailed") };
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
    if (!res.data) return { ok: false, message: await translate("actions.curriculumNotDuplicatedDenied") };
    revalidatePath("/curriculum");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : await translate("actions.curriculumDuplicateFailed") };
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
    if (!res.data) return { ok: false, message: await translate("actions.curriculumNotPermanentlyDeletedDenied") };
    revalidatePath("/curriculum");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : await translate("actions.curriculumPermanentDeleteFailed") };
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
    if (!res.data) return { ok: false, message: await translate("actions.curriculumNotAssignedDenied") };
    revalidatePath("/curriculum");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : await translate("actions.curriculumAssignFailed") };
  }
}
