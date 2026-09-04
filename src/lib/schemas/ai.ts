import { z } from "zod";

/**
 * FSMS V2 — AI schemas (Phase 21). Inputs for the AI console + provider
 * administration. Secrets never appear here — provider keys come from
 * environment variables only (key_slug references them).
 */

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const uuid = () => z.string().regex(UUID_RE, "Invalid id");
const optUuid = () => uuid().nullish();

export const ASK_ACTIONS = ["report", "remarks", "atRisk", "practice", "learnerHelp"] as const;

export const aiAskSchema = z.object({
  action: z.enum(ASK_ACTIONS),
  prompt: z.string().trim().max(4000).nullish(),
  studentId: optUuid(),
  classId: optUuid(),
  subject: z.string().trim().max(200).nullish(),
  level: z.string().trim().max(20).nullish(),
});
export type AiAskInput = z.infer<typeof aiAskSchema>;

export const GENERATE_KINDS = ["quiz", "assessmentTasks", "lessonPlan"] as const;

export const aiGenerateSchema = z.object({
  kind: z.enum(GENERATE_KINDS),
  classId: optUuid(),
  studentId: optUuid(),
  lessonId: optUuid(),
  level: z.string().trim().max(20).nullish(),
  count: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().min(1).max(20).optional(),
  ),
});
export type AiGenerateInput = z.infer<typeof aiGenerateSchema>;

export const aiLessonSummarySchema = z.object({
  classId: uuid(),
  lessonNo: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().min(1).max(999).optional(),
  ),
  date: z.string().date("Invalid date (expected YYYY-MM-DD)").nullish(),
});
export type AiLessonSummaryInput = z.infer<typeof aiLessonSummarySchema>;

// ── provider administration (SUPERUSER) ─────────────────────────────────────

export const providerSaveSchema = z.object({
  id: optUuid(),
  keySlug: z.string().trim().min(1).max(60).nullish(),
  label: z.string().trim().max(200).nullish(),
  kind: z.enum(["openai", "gemini"]).default("openai"),
  baseUrl: z.string().trim().max(500).nullish(),
  model: z.string().trim().min(1).max(200),
  enabled: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()).optional(),
  sortOrder: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().min(0).max(999).optional(),
  ),
});
export type ProviderSaveInput = z.infer<typeof providerSaveSchema>;

export const providerDeleteSchema = z.object({ providerId: uuid() });
export type ProviderDeleteInput = z.infer<typeof providerDeleteSchema>;

export const providerOrderSchema = z.object({
  order: z.array(z.object({ keySlug: z.string().trim().min(1).max(60) })),
});
export type ProviderOrderInput = z.infer<typeof providerOrderSchema>;

export const aiUsageListSchema = z.object({
  from: z.string().date("Invalid date").nullish(),
  to: z.string().date("Invalid date").nullish(),
  action: z.string().trim().max(60).nullish(),
  pageSize: z.number().int().min(1).max(100).default(50),
  cursor: z.string().max(500).nullish(),
});
export type AiUsageListInput = z.infer<typeof aiUsageListSchema>;
