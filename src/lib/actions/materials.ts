"use server";

import { revalidatePath } from "next/cache";
import { requireDbContext } from "@/lib/db/context";
import { MaterialRepository } from "@/lib/db/repos/materials";
import type { ServiceResult } from "@/lib/db/errors";

/**
 * FSMS V2 — materials & resources server actions (Phase 19).
 */

export type MaterialActionState = { ok: boolean; message?: string };

function toState<T>(res: ServiceResult<T>): MaterialActionState {
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
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export async function saveMaterialAction(
  _prev: MaterialActionState | null,
  formData: FormData,
): Promise<MaterialActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new MaterialRepository(ctx).saveMaterial({
      title: field(formData, "title"),
      type: field(formData, "type"),
      levelCode: field(formData, "levelCode"),
      publisher: field(formData, "publisher"),
      isbn: field(formData, "isbn"),
      driveUrl: field(formData, "driveUrl"),
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Material was not saved (denied)" };
    revalidatePath("/materials");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to save material" };
  }
}

export async function saveMaterialUnitAction(
  _prev: MaterialActionState | null,
  formData: FormData,
): Promise<MaterialActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new MaterialRepository(ctx).saveUnit({
      materialId: field(formData, "materialId"),
      no: optionalInt(formData, "no"),
      title: field(formData, "title"),
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Unit was not saved (denied)" };
    revalidatePath("/materials");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to save unit" };
  }
}

export async function saveMaterialMappingAction(
  _prev: MaterialActionState | null,
  formData: FormData,
): Promise<MaterialActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new MaterialRepository(ctx).saveMapping({
      materialUnitId: field(formData, "materialUnitId"),
      targetId: field(formData, "targetId"),
      scope: field(formData, "scope"),
      pageStart: optionalInt(formData, "pageStart"),
      pageEnd: optionalInt(formData, "pageEnd"),
      purpose: field(formData, "purpose"),
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Mapping was not proposed (denied)" };
    revalidatePath("/materials");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to propose mapping" };
  }
}

export async function decideMaterialMappingAction(
  _prev: MaterialActionState | null,
  formData: FormData,
): Promise<MaterialActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new MaterialRepository(ctx).decideMapping({
      mappingId: field(formData, "mappingId"),
      decision: field(formData, "decision") as "verified" | "rejected",
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Mapping decision was not applied (denied)" };
    revalidatePath("/materials");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to decide mapping" };
  }
}

export async function saveMaterialAccessAction(
  _prev: MaterialActionState | null,
  formData: FormData,
): Promise<MaterialActionState> {
  try {
    const ctx = await requireDbContext();
    const repo = new MaterialRepository(ctx);
    const materialId = field(formData, "materialId");
    const classIds = formData.getAll("classIds").filter((v): v is string => typeof v === "string" && v.length > 0);
    const res = await repo.saveAccess({
      materialId,
      assignments: classIds.map((id) => ({ scopeType: "class", scopeId: id })),
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Access policy was not saved (denied)" };
    revalidatePath("/materials");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to save access policy" };
  }
}

export async function saveResourceAction(
  _prev: MaterialActionState | null,
  formData: FormData,
): Promise<MaterialActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new MaterialRepository(ctx).saveResource({
      title: field(formData, "title"),
      url: field(formData, "url"),
      filePath: null,
      kind: field(formData, "kind"),
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Resource was not saved (denied)" };
    revalidatePath("/materials");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to save resource" };
  }
}

export async function deleteResourceAction(
  _prev: MaterialActionState | null,
  formData: FormData,
): Promise<MaterialActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new MaterialRepository(ctx).deleteResource({
      resourceId: field(formData, "resourceId"),
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Resource was not deleted (denied)" };
    revalidatePath("/materials");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to delete resource" };
  }
}

export async function saveMethodologyAction(
  _prev: MaterialActionState | null,
  formData: FormData,
): Promise<MaterialActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new MaterialRepository(ctx).saveMethodology({
      title: field(formData, "title"),
      body: field(formData, "body"),
      levelCode: field(formData, "levelCode"),
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Methodology entry was not saved (denied)" };
    revalidatePath("/materials");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to save methodology" };
  }
}

export async function deleteMethodologyAction(
  _prev: MaterialActionState | null,
  formData: FormData,
): Promise<MaterialActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new MaterialRepository(ctx).deleteMethodology({
      methodologyId: field(formData, "methodologyId"),
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Methodology entry was not deleted (denied)" };
    revalidatePath("/materials");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to delete methodology" };
  }
}

export async function saveTeacherMaterialAction(
  _prev: MaterialActionState | null,
  formData: FormData,
): Promise<MaterialActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new MaterialRepository(ctx).saveTeacherMaterial({
      title: field(formData, "title"),
      kind: field(formData, "kind"),
      payload: field(formData, "payload"),
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Teacher material was not saved (denied)" };
    revalidatePath("/materials");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to save teacher material" };
  }
}

export async function saveMaterialFeedbackAction(
  _prev: MaterialActionState | null,
  formData: FormData,
): Promise<MaterialActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new MaterialRepository(ctx).saveFeedback({
      materialId: field(formData, "materialId"),
      rating: Number(field(formData, "rating") ?? 0),
      note: field(formData, "note"),
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Feedback was not saved (denied)" };
    revalidatePath("/materials");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to save feedback" };
  }
}
