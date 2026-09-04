import { Repository } from "../repository";
import { parseOrFail } from "../validate";
import { fail, ok, type ServiceResult } from "../errors";
import {
  providerSaveSchema,
  providerDeleteSchema,
  providerOrderSchema,
  aiUsageListSchema,
  type ProviderSaveInput,
  type ProviderOrderInput,
  type AiUsageListInput,
} from "@/lib/schemas/ai";

/**
 * FSMS V2 — AiRepository (Phase 21).
 *
 * Thin repository over the Phase 21 AI RPCs: provider METADATA administration
 * (SUPERUSER only — keys never touch the DB), usage/cost logging (staff) and
 * usage reads (scoped: own unless leadership). The actual model calls happen in
 * the app's AiEngine; every RPC is SECURITY DEFINER and re-checks its gate.
 */

export interface AiProviderConfig {
  id: string;
  key_slug: string;
  label: string;
  kind: string;
  base_url: string | null;
  model: string;
  enabled: boolean;
  sort_order: number;
  is_custom: boolean;
}

export interface AiProviderStatus {
  key_slug: string;
  label: string;
  kind: string;
  base_url: string | null;
  model: string;
  enabled: boolean;
}

export interface AiUsageTotals {
  calls: number;
  prompt_tokens: number;
  completion_tokens: number;
  cost: number;
  statuses: Record<string, number>;
}

export interface AiUsageRow {
  id: string;
  action: string;
  provider: string | null;
  model: string | null;
  prompt_tokens: number;
  completion_tokens: number;
  cost: number;
  status: string;
  error: string | null;
  latency_ms: number | null;
  created_at: string;
  user_name: string | null;
}

export interface AiUsageLogResult {
  id: string;
  action: string;
  status: string;
  cost: number;
  created_at: string;
}

export interface AiStatus {
  providers: AiProviderStatus[];
  usage_today: AiUsageTotals;
}

export class AiRepository extends Repository {
  async providerList(): Promise<ServiceResult<AiProviderConfig[]>> {
    const denied = this.can("aiProviders");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<{ rows: AiProviderConfig[] } | null>("ai_provider_list", {});
    if (error) return fail(error);
    return ok((data as { rows: AiProviderConfig[] } | null)?.rows ?? []);
  }

  async saveProvider(input: unknown): Promise<ServiceResult<AiProviderConfig | null>> {
    const parsed = parseOrFail(providerSaveSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("saveAiProvider");
    if (denied) return fail(denied);
    const f: ProviderSaveInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<AiProviderConfig | null>("ai_provider_save", {
      p_id: f.id ?? null,
      p_key_slug: f.keySlug ?? null,
      p_label: f.label ?? null,
      p_kind: f.kind,
      p_base_url: f.baseUrl ?? null,
      p_model: f.model,
      p_enabled: f.enabled ?? true,
      p_sort_order: f.sortOrder ?? 0,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async deleteProvider(input: unknown): Promise<ServiceResult<{ id: string; key_slug: string } | null>> {
    const parsed = parseOrFail(providerDeleteSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("deleteCustomAi");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<{ id: string; key_slug: string } | null>("ai_provider_delete", {
      p_id: parsed.data.providerId,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async orderProviders(input: unknown): Promise<ServiceResult<{ updated: number } | null>> {
    const parsed = parseOrFail(providerOrderSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("saveAiOrder");
    if (denied) return fail(denied);
    const f: ProviderOrderInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<{ updated: number } | null>("ai_provider_order", {
      p_order: JSON.stringify(f.order.map((o) => ({ key_slug: o.keySlug }))),
    });
    if (error) return fail(error);
    return ok(data);
  }

  async logUsage(input: {
    action: string;
    provider?: string | null;
    model?: string | null;
    promptTokens?: number;
    completionTokens?: number;
    cost?: number;
    status?: string;
    error?: string | null;
    latencyMs?: number | null;
  }): Promise<ServiceResult<AiUsageLogResult | null>> {
    const denied = this.can("aiAsk");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<AiUsageLogResult | null>("ai_usage_log", {
      p_action: input.action,
      p_provider: input.provider ?? null,
      p_model: input.model ?? null,
      p_prompt_tokens: input.promptTokens ?? 0,
      p_completion_tokens: input.completionTokens ?? 0,
      p_cost: input.cost ?? 0,
      p_status: input.status ?? "ok",
      p_error: input.error ?? null,
      p_latency_ms: input.latencyMs ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async usageTotals(input: { from?: string | null; to?: string | null } = {}): Promise<ServiceResult<AiUsageTotals | null>> {
    const { data, error } = await this.ctx.db.rpc<AiUsageTotals | null>("ai_usage_totals", {
      p_from: input.from ?? null,
      p_to: input.to ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async usageList(input: unknown): Promise<ServiceResult<{ rows: AiUsageRow[]; next_cursor: string | null } | null>> {
    const parsed = parseOrFail(aiUsageListSchema, input);
    if (!parsed.ok) return parsed;
    const f: AiUsageListInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<{ rows: AiUsageRow[]; next_cursor: string | null } | null>("ai_usage_list", {
      p_from: f.from ?? null,
      p_to: f.to ?? null,
      p_action: f.action ?? null,
      p_page_size: f.pageSize,
      p_cursor: f.cursor ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async status(): Promise<ServiceResult<AiStatus | null>> {
    const { data, error } = await this.ctx.db.rpc<AiStatus | null>("ai_status", {});
    if (error) return fail(error);
    return ok(data);
  }
}
