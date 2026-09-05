import { z } from "zod";
import { Repository } from "../repository";
import { parseOrFail } from "../validate";
import { ok, fail, type ServiceResult } from "../errors";
import { settingKeySchema, settingValueSchema } from "@/lib/schemas/settings";

/** FSMS V2 — SettingsRepository (Phase 31 UAT). Key/value school settings. */

export interface SchoolProfile {
  id: string;
  name: string | null;
  timezone: string | null;
  currency: string | null;
  locale: string | null;
  branding: Record<string, unknown> | null;
}

export interface SettingRow {
  key: string;
  value: unknown;
  updated_at: string | null;
  updated_by: string | null;
  updated_by_name: string | null;
}

export interface SettingsList {
  school: SchoolProfile | null;
  rows: SettingRow[];
}

interface SettingsListRpc {
  school: SchoolProfile | null;
  rows: SettingRow[];
}

const saveInputSchema = z.object({
  key: settingKeySchema,
  value: settingValueSchema,
});

export class SettingsRepository extends Repository {
  /** School profile + settings (gated by `settings` inside the RPC). */
  async list(): Promise<ServiceResult<SettingsList>> {
    const { data, error } = await this.ctx.db.rpc<SettingsListRpc>("settings_list", {});
    if (error) return fail(error);
    const empty: SettingsList = { school: null, rows: [] };
    return ok(data && typeof data === "object" ? { ...empty, ...data } : empty);
  }

  /** Upsert a scalar setting (gated by `saveSetting`). Returns null if denied. */
  async save(input: unknown): Promise<ServiceResult<SettingRow | null>> {
    const parsed = parseOrFail(saveInputSchema, input);
    if (!parsed.ok) return parsed;
    const { key, value } = parsed.data;
    // jsonb params must arrive as JSON text (matches lessons/finance repos).
    const { data, error } = await this.ctx.db.rpc<SettingRow | null>("settings_save", {
      p_key: key,
      p_value: JSON.stringify(value ?? null),
    });
    if (error) return fail(error);
    return ok(data ?? null);
  }

  /** Delete a setting (gated by `saveSetting`). */
  async remove(key: unknown): Promise<ServiceResult<{ key: string } | null>> {
    const parsed = parseOrFail(settingKeySchema, key);
    if (!parsed.ok) return parsed;
    const { data, error } = await this.ctx.db.rpc<{ key: string } | null>("settings_remove", {
      p_key: parsed.data,
    });
    if (error) return fail(error);
    return ok(data ?? null);
  }
}
