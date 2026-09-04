import { describe, expect, it } from "vitest";
import { AiEngine, RateLimiter, estimateCost, estimateTokens, type AiProviderRuntime, type FetchFn } from "./engine";

const providers: AiProviderRuntime[] = [
  { key_slug: "groq", label: "Groq", kind: "openai", base_url: "https://api.groq.com/openai/v1", model: "llama-3.1-70b-versatile" },
  { key_slug: "gemini", label: "Gemini", kind: "gemini", base_url: "https://generativelanguage.googleapis.com/v1beta", model: "gemini-2.0-flash" },
];

const budget = { maxDailyCost: 5, maxTokensPerCall: 2048, requestsPerMinute: 20 };
const keys = { groq: "k1", gemini: "k2" };

function okFetch(): FetchFn {
  return async (_url: string, init: RequestInit) => {
    const req = JSON.parse(init.body as string) as { model?: string };
    const model = req.model ?? "";
    return new Response(
      JSON.stringify({ choices: [{ message: { content: `reply-from-${model}` } }] }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };
}

function failingFetch(status = 500): FetchFn {
  return async () => new Response("boom", { status });
}

describe("AiEngine", () => {
  it("returns the first provider that succeeds", async () => {
    const engine = new AiEngine({ providers, keys, budget, fetchFn: okFetch() });
    const res = await engine.run({
      action: "aiAsk",
      prompt: "hello",
      fallback: () => "offline",
      periodCost: 0,
    });
    expect(res.status).toBe("ok");
    expect(res.provider).toBe("groq");
    expect(res.text).toBe("reply-from-llama-3.1-70b-versatile");
    expect(res.cost).toBeGreaterThan(0);
  });

  it("fails over to the next provider on error", async () => {
    const calls: string[] = [];
    const fetchFn: FetchFn = async (url) => {
      calls.push(url);
      if (url.includes("groq")) return new Response("bad", { status: 500 });
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "gemini-ok" }] } }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };
    const engine = new AiEngine({ providers, keys, budget, fetchFn });
    const res = await engine.run({ action: "aiAsk", prompt: "hi", fallback: () => "offline", periodCost: 0 });
    expect(res.status).toBe("ok");
    expect(res.provider).toBe("gemini");
    expect(res.text).toBe("gemini-ok");
    expect(calls.length).toBe(2);
  });

  it("falls back deterministically when all providers fail", async () => {
    const engine = new AiEngine({ providers, keys, budget, fetchFn: failingFetch() });
    const res = await engine.run({
      action: "aiAsk",
      prompt: "hi",
      fallback: () => "offline answer",
      periodCost: 0,
    });
    expect(res.status).toBe("fallback");
    expect(res.provider).toBe("fallback");
    expect(res.text).toBe("offline answer");
    expect(res.error).toBeTruthy();
  });

  it("falls back when no key is configured", async () => {
    const engine = new AiEngine({ providers, keys: {}, budget, fetchFn: okFetch() });
    const res = await engine.run({ action: "aiAsk", prompt: "hi", fallback: () => "no-key", periodCost: 0 });
    expect(res.status).toBe("fallback");
    expect(res.provider).toBe("fallback");
  });

  it("parses JSON when requested", async () => {
    const fetchFn: FetchFn = async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: '[{"no":1}]' } }] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    const engine = new AiEngine({ providers, keys, budget, fetchFn });
    const res = await engine.run({
      action: "quiz",
      prompt: "quiz",
      expectJson: true,
      fallback: () => "[]",
      periodCost: 0,
    });
    expect(res.json).toEqual([{ no: 1 }]);
  });

  it("enforces the daily cost budget", async () => {
    const engine = new AiEngine({ providers, keys, budget, fetchFn: okFetch() });
    const res = await engine.run({
      action: "aiAsk",
      prompt: "hi",
      fallback: () => "budget-hit",
      periodCost: budget.maxDailyCost, // already at the cap
    });
    expect(res.status).toBe("fallback");
    expect(res.provider).toBe("fallback");
    expect(res.error).toContain("budget");
  });

  it("rejects oversized prompts before any network call", async () => {
    let called = false;
    const engine = new AiEngine({
      providers,
      keys,
      budget: { ...budget, maxTokensPerCall: 10 },
      fetchFn: async () => {
        called = true;
        return new Response("{}", { status: 200 });
      },
    });
    const res = await engine.run({
      action: "aiAsk",
      prompt: "x".repeat(1000),
      fallback: () => "too-big",
      periodCost: 0,
    });
    expect(res.status).toBe("fallback");
    expect(called).toBe(false);
  });
});

describe("RateLimiter", () => {
  it("caps requests per minute per provider", () => {
    const rl = new RateLimiter(2);
    expect(rl.tryAcquire("p", 0)).toBe(true);
    expect(rl.tryAcquire("p", 1)).toBe(true);
    expect(rl.tryAcquire("p", 2)).toBe(false);
    expect(rl.tryAcquire("p", 61_000)).toBe(true); // window reset
  });
});

describe("estimateTokens / estimateCost", () => {
  it("estimates tokens by length", () => {
    expect(estimateTokens("")).toBe(1);
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("a".repeat(40))).toBe(10);
  });
  it("uses per-model pricing", () => {
    const cheap = estimateCost("gemini-2.0-flash", 1_000_000, 1_000_000);
    const unknown = estimateCost("mystery-model", 1_000_000, 1_000_000);
    expect(cheap).toBeLessThan(unknown);
  });
});
