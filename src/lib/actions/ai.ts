"use server";

import { revalidatePath } from "next/cache";
import { requireDbContext } from "@/lib/db/context";
import { AiRepository } from "@/lib/db/repos/ai";
import { ReportingRepository } from "@/lib/db/repos/reporting";
import { CurriculumRepository } from "@/lib/db/repos/curriculum";
import { LessonRepository, localized } from "@/lib/db/repos/lessons";
import { StudentRepository } from "@/lib/db/repos/students";
import { AiEngine } from "@/lib/ai/engine";
import { aiKeyring, aiBudget, toRuntime } from "@/lib/ai/config";
import * as fb from "@/lib/ai/fallback";
import * as pm from "@/lib/ai/prompts";
import type { ServiceResult } from "@/lib/db/errors";

/**
 * FSMS V2 — AI server actions (Phase 21).
 *
 * Composes the AiEngine (provider chain + failover + rate limit + cost +
 * deterministic fallback) with the AiRepository (usage logging, provider
 * config). Keys are read from environment variables only — never the DB.
 */

export type AiActionState = {
  ok: boolean;
  text?: string;
  provider?: string;
  status?: string;
  message?: string;
};

function toState(res: ServiceResult<unknown>): AiActionState {
  if (res.ok) return { ok: true };
  return { ok: false, message: res.error.message };
}

function field(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

export async function aiAskAction(_prev: AiActionState | null, formData: FormData): Promise<AiActionState> {
  try {
    const ctx = await requireDbContext();
    const ai = new AiRepository(ctx);
    const action = field(formData, "action") ?? "learnerHelp";
    const studentId = field(formData, "studentId");
    const classId = field(formData, "classId");
    const subject = field(formData, "subject");
    const level = field(formData, "level");
    const freePrompt = field(formData, "prompt");

    let prompt = "";
    let fallback: () => string = () => "(offline) nothing to generate.";

    if (action === "report" && studentId) {
      const res = await new ReportingRepository(ctx).studentProgressReport({ studentId });
      if (!res.ok || !res.data) return { ok: false, message: "Student report unavailable" };
      const s = res.data;
      const fbs: fb.FallbackStudent = {
        name: s.student?.name ?? null,
        level_code: s.student?.level_code ?? null,
        academic_status: s.student?.academic_status ?? null,
        attendance: s.attendance,
        assessments: s.assessments,
        evidence: s.evidence,
      };
      prompt = pm.studentReportPrompt(fbs);
      fallback = () => fb.studentReportNarrative(fbs);
    } else if (action === "remarks") {
      let name: string | null = null;
      if (studentId) {
        const s = await new StudentRepository(ctx).getById(studentId);
        name = s.ok ? (s.data?.name ?? null) : null;
      }
      prompt = pm.remarksPrompt(name, subject);
      fallback = () => fb.remarks(name, subject);
    } else if (action === "atRisk" && classId) {
      const res = await new ReportingRepository(ctx).learnerProgressOverview({ classId });
      if (!res.ok || !res.data) return { ok: false, message: "Learner overview unavailable" };
      const rows: fb.FallbackAtRiskRow[] = res.data.students.map((r) => ({
        id: r.id,
        name: r.name,
        attendance_rate: r.attendance_rate,
        assessment_avg: r.assessment_avg,
      }));
      prompt = pm.atRiskPrompt(rows);
      fallback = () => fb.atRiskList(rows);
    } else if (action === "practice") {
      const res = await new CurriculumRepository(ctx).targets(level);
      const objectives: fb.FallbackObjective[] = (res.ok ? res.data : []).map((t) => ({
        code: t.id,
        text: localized(t.title, ctx.profile.locale ?? "en") || t.id,
      }));
      prompt = pm.practicePrompt(level, objectives);
      fallback = () => fb.practice(level, objectives);
    } else {
      prompt = pm.learnerHelpPrompt(freePrompt ?? "");
      fallback = () => fb.learnerHelp(freePrompt ?? "");
    }

    const status = await ai.status();
    const periodCost = status.ok && status.data ? status.data.usage_today.cost : 0;
    const providers = status.ok && status.data ? status.data.providers : [];
    const engine = new AiEngine({ providers: toRuntime(providers), keys: aiKeyring(), budget: aiBudget() });
    const result = await engine.run({ action, prompt, expectJson: false, fallback, periodCost });

    await ai.logUsage({
      action,
      provider: result.provider,
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      cost: result.cost,
      status: result.status,
      error: result.error,
      latencyMs: result.latencyMs,
    });

    return {
      ok: true,
      text: result.text,
      provider: result.provider,
      status: result.status,
      message: result.status === "fallback" && result.error ? `Fallback used: ${result.error}` : undefined,
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "AI request failed" };
  }
}

export async function aiGenerateAction(_prev: AiActionState | null, formData: FormData): Promise<AiActionState> {
  try {
    const ctx = await requireDbContext();
    const ai = new AiRepository(ctx);
    const kind = field(formData, "kind") ?? "quiz";
    const lessonId = field(formData, "lessonId");
    const level = field(formData, "level");
    const count = Number(field(formData, "count") ?? 5);

    let prompt = "";
    let expectJson = false;
    let fallback: () => string = () => "[]";

    // Shared: curriculum targets for the requested level (quiz/assessment/plan).
    const targets = await new CurriculumRepository(ctx).targets(level);
    const objectives: fb.FallbackObjective[] = (targets.ok ? targets.data : []).map((t) => ({
      code: t.id,
      text: localized(t.title, ctx.profile.locale ?? "en") || t.id,
    }));

    if (kind === "lessonPlan") {
      let fbl: fb.FallbackLesson;
      if (lessonId) {
        const res = await new LessonRepository(ctx).detail({ lessonId });
        if (res.ok && res.data) {
          fbl = {
            title: localized(res.data.title, ctx.profile.locale ?? "en") || res.data.code,
            code: res.data.code,
            objectives: res.data.objectives.map((o) => ({
              code: o.code,
              text: localized(o.text, ctx.profile.locale ?? "en") || o.code || undefined,
            })),
          };
        } else {
          fbl = { title: `Level ${(level ?? "current").toUpperCase()} plan`, objectives };
        }
      } else {
        fbl = { title: `Level ${(level ?? "current").toUpperCase()} plan`, objectives };
      }
      prompt = pm.lessonPlanPrompt(fbl);
      fallback = () => fb.lessonPlan(fbl);
    } else if (kind === "quiz") {
      expectJson = true;
      prompt = pm.quizPrompt(level, objectives, count);
      fallback = () => JSON.stringify(fb.quizQuestions(level, objectives, count));
    } else {
      expectJson = true;
      prompt = pm.assessmentTasksPrompt(level, objectives);
      fallback = () => JSON.stringify(fb.assessmentTasks(level, objectives));
    }

    const status = await ai.status();
    const periodCost = status.ok && status.data ? status.data.usage_today.cost : 0;
    const providers = status.ok && status.data ? status.data.providers : [];
    const engine = new AiEngine({ providers: toRuntime(providers), keys: aiKeyring(), budget: aiBudget() });
    const result = await engine.run({ action: kind, prompt, expectJson, fallback, periodCost });

    await ai.logUsage({
      action: kind,
      provider: result.provider,
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      cost: result.cost,
      status: result.status,
      error: result.error,
      latencyMs: result.latencyMs,
    });

    return {
      ok: true,
      text: result.text,
      provider: result.provider,
      status: result.status,
      message: result.status === "fallback" && result.error ? `Fallback used: ${result.error}` : undefined,
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "AI generation failed" };
  }
}

export async function aiLessonSummaryAction(_prev: AiActionState | null, formData: FormData): Promise<AiActionState> {
  try {
    const ctx = await requireDbContext();
    const ai = new AiRepository(ctx);
    const classId = field(formData, "classId");
    const lessonNoRaw = field(formData, "lessonNo");
    const date = field(formData, "date");
    if (!classId) return { ok: false, message: "Choose a class" };
    const lessonNo = lessonNoRaw ? Number(lessonNoRaw) : null;

    // Pull the latest matching lesson log for the summary context.
    const logs = await new LessonRepository(ctx).logs({ classId, pageSize: 1 });
    const topic = logs.ok && logs.data?.items?.[0] ? logs.data.items[0].topic : null;

    const prompt = pm.lessonSummaryPrompt(topic, lessonNo, date);
    const fallback = () => fb.lessonSummary(topic, lessonNo, date);

    const status = await ai.status();
    const periodCost = status.ok && status.data ? status.data.usage_today.cost : 0;
    const providers = status.ok && status.data ? status.data.providers : [];
    const engine = new AiEngine({ providers: toRuntime(providers), keys: aiKeyring(), budget: aiBudget() });
    const result = await engine.run({ action: "aiLessonSummary", prompt, fallback, periodCost });

    await ai.logUsage({
      action: "aiLessonSummary",
      provider: result.provider,
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      cost: result.cost,
      status: result.status,
      error: result.error,
      latencyMs: result.latencyMs,
    });

    return { ok: true, text: result.text, provider: result.provider, status: result.status };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Lesson summary failed" };
  }
}

// ── provider administration (SUPERUSER) ─────────────────────────────────────

export async function aiProviderSaveAction(_prev: AiActionState | null, formData: FormData): Promise<AiActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new AiRepository(ctx).saveProvider({
      id: field(formData, "id"),
      keySlug: field(formData, "keySlug"),
      label: field(formData, "label"),
      kind: field(formData, "kind") ?? "openai",
      baseUrl: field(formData, "baseUrl"),
      model: field(formData, "model"),
      enabled: field(formData, "enabled") !== "false",
      sortOrder: field(formData, "sortOrder") ? Number(field(formData, "sortOrder")) : undefined,
    });
    if (!res.ok) return toState(res);
    revalidatePath("/ai");
    return { ok: true, message: "Provider saved" };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to save provider" };
  }
}

export async function aiProviderDeleteAction(_prev: AiActionState | null, formData: FormData): Promise<AiActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new AiRepository(ctx).deleteProvider({ providerId: field(formData, "providerId") ?? "" });
    if (!res.ok) return toState(res);
    revalidatePath("/ai");
    return { ok: true, message: res.data ? "Provider deleted" : "Provider not deleted (built-in or missing)" };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to delete provider" };
  }
}

export async function aiProviderOrderAction(_prev: AiActionState | null, formData: FormData): Promise<AiActionState> {
  try {
    const ctx = await requireDbContext();
    const raw = field(formData, "order") ?? "[]";
    let order: { keySlug: string }[];
    try {
      order = JSON.parse(raw);
    } catch {
      return { ok: false, message: "Invalid order payload" };
    }
    const res = await new AiRepository(ctx).orderProviders({ order });
    if (!res.ok) return toState(res);
    revalidatePath("/ai");
    return { ok: true, message: `Reordered ${res.data?.updated ?? 0} provider(s)` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to reorder providers" };
  }
}
