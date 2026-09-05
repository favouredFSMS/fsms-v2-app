"use server";

import { revalidatePath } from "next/cache";
import { translate } from "@/i18n/server";
import { requireDbContext } from "@/lib/db/context";
import { SettingsRepository } from "@/lib/db/repos/settings";
import type { ServiceResult } from "@/lib/db/errors";

/** FSMS V2 — settings server actions (Phase 31 UAT). */

export type SettingsActionState = { ok: boolean; message?: string };

function toState<T>(res: ServiceResult<T>): SettingsActionState {
  if (res.ok) return { ok: true };
  return { ok: false, message: res.error.message };
}

/** Parse a submitted value by type: text/number/boolean/json → jsonb scalar. */
function parseValue(formData: FormData): { key: string; value: unknown } | null {
  const key = formData.get("key");
  const raw = formData.get("value");
  const type = formData.get("valueType");
  if (typeof key !== "string" || !key.trim()) return null;
  if (typeof raw !== "string") return null;
  const k = key.trim();
  switch (type) {
    case "boolean":
      return { key: k, value: raw === "true" };
    case "number": {
      const n = Number(raw);
      return { key: k, value: Number.isFinite(n) ? n : raw };
    }
    case "json":
      try {
        return { key: k, value: JSON.parse(raw) };
      } catch {
        return { key: k, value: raw };
      }
    default:
      return { key: k, value: raw };
  }
}

export async function saveSettingAction(
  _prev: SettingsActionState | null,
  formData: FormData,
): Promise<SettingsActionState> {
  try {
    const parsed = parseValue(formData);
    if (!parsed) return { ok: false, message: await translate("settings.invalidKey") };
    const ctx = await requireDbContext();
    const repo = new SettingsRepository(ctx);
    const res = await repo.save(parsed);
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: await translate("settings.saveDenied") };
    revalidatePath("/settings");
    return { ok: true };
  } catch {
    return { ok: false, message: await translate("settings.saveFailed") };
  }
}

export async function removeSettingAction(
  _prev: SettingsActionState | null,
  formData: FormData,
): Promise<SettingsActionState> {
  try {
    const key = formData.get("key");
    if (typeof key !== "string" || !key.trim()) {
      return { ok: false, message: await translate("settings.invalidKey") };
    }
    const ctx = await requireDbContext();
    const repo = new SettingsRepository(ctx);
    const res = await repo.remove(key.trim());
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: await translate("settings.saveDenied") };
    revalidatePath("/settings");
    return { ok: true };
  } catch {
    return { ok: false, message: await translate("settings.saveFailed") };
  }
}
