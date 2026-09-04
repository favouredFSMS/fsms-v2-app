/**
 * FSMS V2 — AI engine (Phase 21).
 *
 * Server-side provider chain with failover, per-provider rate limiting, usage/
 * cost estimation, JSON parsing and a deterministic fallback — the roadmap
 * Phase 21 "AI service layer". The engine is deliberately transport-injected
 * (`fetchFn`) so it is unit-testable without any network or API key, and it
 * never stores secrets (keys come from the caller's keyring).
 *
 * Provider kinds:
 *   * "openai" — any OpenAI-compatible `/chat/completions` endpoint (Groq,
 *     OpenRouter, custom).
 *   * "gemini" — Google Gemini `generateContent`.
 */

export interface AiProviderRuntime {
  key_slug: string;
  label: string;
  kind: "openai" | "gemini";
  base_url: string | null;
  model: string;
  enabled?: boolean;
}

export interface AiBudget {
  /** Hard cap on total estimated spend for the call (USD). */
  maxDailyCost: number;
  /** Prompt tokens above this are rejected before any network call. */
  maxTokensPerCall: number;
  /** Per-provider requests allowed per minute. */
  requestsPerMinute: number;
}

export interface AiRunInput {
  action: string;
  prompt: string;
  expectJson?: boolean;
  /** Deterministic output when no provider is usable. */
  fallback: () => string;
  /** Running cost for the current period (from ai_usage_totals), for the budget gate. */
  periodCost: number;
}

export interface AiRunResult {
  text: string;
  json: unknown;
  provider: string; // key_slug, or "fallback"
  model: string | null;
  status: "ok" | "fallback" | "error";
  promptTokens: number;
  completionTokens: number;
  cost: number;
  latencyMs: number;
  error: string | null;
}

export type FetchFn = (url: string, init: RequestInit) => Promise<Response>;

/** Rough per-model pricing in USD per 1M tokens (input, output). */
const PRICING: Record<string, [number, number]> = {
  "gemini-2.0-flash": [0.1, 0.4],
  "llama-3.1-70b-versatile": [0.59, 0.79],
  "openai/gpt-4o-mini": [0.15, 0.6],
  "gpt-4o-mini": [0.15, 0.6],
};
const DEFAULT_PRICE: [number, number] = [1, 2];

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function estimateCost(model: string, inTokens: number, outTokens: number): number {
  const [pi, po] = PRICING[model] ?? DEFAULT_PRICE;
  return (inTokens * pi + outTokens * po) / 1_000_000;
}

/** Minimal in-memory token bucket (per-provider requests/min). */
export class RateLimiter {
  private buckets = new Map<string, { tokens: number; windowStart: number }>();

  constructor(private readonly perMinute: number) {}

  tryAcquire(provider: string, now = Date.now()): boolean {
    let b = this.buckets.get(provider);
    if (!b || now - b.windowStart >= 60_000) {
      b = { tokens: this.perMinute, windowStart: now };
      this.buckets.set(provider, b);
    }
    if (b.tokens <= 0) return false;
    b.tokens -= 1;
    return true;
  }
}

function parseJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const m = trimmed.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        /* fall through */
      }
    }
    return null;
  }
}

async function withTimeout(ms: number, fn: () => Promise<Response>): Promise<Response> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`AI provider timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([fn(), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export interface AiEngineOptions {
  fetchFn?: FetchFn;
  providers: AiProviderRuntime[];
  keys: Record<string, string>;
  budget: AiBudget;
  timeoutMs?: number;
}

export class AiEngine {
  private readonly fetchFn: FetchFn;
  private readonly limiter: RateLimiter;

  constructor(private readonly opts: AiEngineOptions) {
    this.fetchFn = opts.fetchFn ?? ((url, init) => fetch(url, init));
    this.limiter = new RateLimiter(opts.budget.requestsPerMinute);
  }

  /** Try the provider chain in order; fall back deterministically on failure. */
  async run(input: AiRunInput): Promise<AiRunResult> {
    const start = Date.now();
    const promptTokens = estimateTokens(input.prompt);
    let lastError: string | null = null;

    // Up-front budget gate: never touch a provider once the period cap is hit.
    if (input.periodCost >= this.opts.budget.maxDailyCost) {
      lastError = "daily cost budget reached";
      return this.fallback(input, lastError, start, promptTokens);
    }

    if (promptTokens > this.opts.budget.maxTokensPerCall) {
      lastError = `prompt too large (${promptTokens} > ${this.opts.budget.maxTokensPerCall})`;
      return this.fallback(input, lastError, start, promptTokens);
    }

    const usable = this.opts.providers.filter(
      (p) => p.enabled !== false && this.opts.keys[p.key_slug],
    );

    for (const provider of usable) {
      const key = this.opts.keys[provider.key_slug];
      if (!this.limiter.tryAcquire(provider.key_slug)) {
        lastError = `rate limit exceeded for ${provider.key_slug}`;
        continue;
      }
      try {
        const t0 = Date.now();
        const res = await this.callProvider(provider, key, input.prompt);
        const latency = Date.now() - t0;
        const completionTokens = estimateTokens(res);
        const cost = estimateCost(provider.model, promptTokens, completionTokens);
        // Budget gate: if this call would exceed the period budget, refuse it.
        if (input.periodCost + cost > this.opts.budget.maxDailyCost) {
          lastError = `daily cost budget reached (${input.periodCost.toFixed(4)} + ${cost.toFixed(4)})`;
          continue;
        }
        return {
          text: res,
          json: input.expectJson ? parseJson(res) : undefined,
          provider: provider.key_slug,
          model: provider.model,
          status: "ok",
          promptTokens,
          completionTokens,
          cost,
          latencyMs: latency,
          error: null,
        };
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        // fail over to the next provider in the chain
      }
    }

    return this.fallback(input, lastError, start, promptTokens);
  }

  private fallback(
    input: AiRunInput,
    error: string | null,
    start: number,
    promptTokens: number,
  ): AiRunResult {
    const text = input.fallback();
    return {
      text,
      json: input.expectJson ? parseJson(text) : undefined,
      provider: "fallback",
      model: null,
      status: "fallback",
      promptTokens,
      completionTokens: estimateTokens(text),
      cost: 0,
      latencyMs: Date.now() - start,
      error,
    };
  }

  private async callProvider(provider: AiProviderRuntime, key: string, prompt: string): Promise<string> {
    if (provider.kind === "gemini") {
      return this.geminiChat(provider, key, prompt);
    }
    return this.openAiChat(provider, key, prompt);
  }

  private async openAiChat(provider: AiProviderRuntime, key: string, prompt: string): Promise<string> {
    const base = (provider.base_url ?? "https://api.openai.com/v1").replace(/\/+$/, "");
    const res = await withTimeout(this.opts.timeoutMs ?? 30_000, () =>
      this.fetchFn(`${base}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: provider.model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.4,
        }),
      }),
    );
    if (!res.ok) throw new Error(`${provider.key_slug} responded ${res.status}`);
    const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = body.choices?.[0]?.message?.content;
    if (!text) throw new Error(`${provider.key_slug} returned an empty completion`);
    return text;
  }

  private async geminiChat(provider: AiProviderRuntime, key: string, prompt: string): Promise<string> {
    const base = (provider.base_url ?? "https://generativelanguage.googleapis.com/v1beta").replace(/\/+$/, "");
    const url = `${base}/models/${encodeURIComponent(provider.model)}:generateContent?key=${encodeURIComponent(key)}`;
    const res = await withTimeout(this.opts.timeoutMs ?? 30_000, () =>
      this.fetchFn(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4 },
        }),
      }),
    );
    if (!res.ok) throw new Error(`${provider.key_slug} responded ${res.status}`);
    const body = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
    if (!text) throw new Error(`${provider.key_slug} returned an empty completion`);
    return text;
  }
}
