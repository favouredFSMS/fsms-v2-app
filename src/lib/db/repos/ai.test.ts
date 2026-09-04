import { describe, expect, it } from "vitest";
import { AiRepository } from "./ai";
import { fakeAdapter } from "../testing/fake-adapter";
import type { DbContext } from "../context";
import type { AuthProfile } from "@/lib/auth/types";

const profile = (over: Partial<AuthProfile> = {}): AuthProfile => ({
  id: "u1",
  school_id: "s1",
  email: null,
  name: null,
  role_id: null,
  role_base: "admin1",
  role_key: "admin1",
  role_label: "Owner",
  rank: 100,
  locale: "en",
  notify_lang: "en",
  status: "active",
  must_change_password: false,
  linked_ids: [],
  permissions: ["*"],
  ...over,
});

const teacher = (): AuthProfile =>
  profile({
    role_base: "teacher",
    role_key: "teacher",
    role_label: "Teacher",
    rank: 40,
    permissions: ["aiAsk", "aiGenerate", "aiStatus", "learnerHelp", "aiLessonSummary", "generateTeacherLessonPlan"],
  });

const student = (): AuthProfile =>
  profile({
    role_base: "student",
    role_key: "student",
    role_label: "Student",
    rank: 0,
    permissions: ["aiStatus", "learnerHelp"],
  });

const ctx = (adapter: ReturnType<typeof fakeAdapter>, p = profile()): DbContext => ({ profile: p, db: adapter });

describe("AiRepository", () => {
  it("providerList enforces SUPERUSER (teacher denied)", async () => {
    const res = await new AiRepository(ctx(fakeAdapter(), teacher())).providerList();
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("forbidden");
  });

  it("saveProvider passes args through (admin1)", async () => {
    let fn = "";
    let args: Record<string, unknown> | undefined;
    const adapter = fakeAdapter({
      async rpc<T>(n: string, a?: Record<string, unknown>) {
        fn = n;
        args = a;
        return { data: { id: "p1" } as T, error: null };
      },
    });
    const res = await new AiRepository(ctx(adapter)).saveProvider({
      keySlug: "custom-x",
      label: "Custom",
      kind: "openai",
      baseUrl: "https://x.example/v1",
      model: "m",
      enabled: true,
      sortOrder: 5,
    });
    expect(res.ok).toBe(true);
    expect(fn).toBe("ai_provider_save");
    expect(args).toEqual({
      p_id: null,
      p_key_slug: "custom-x",
      p_label: "Custom",
      p_kind: "openai",
      p_base_url: "https://x.example/v1",
      p_model: "m",
      p_enabled: true,
      p_sort_order: 5,
    });
  });

  it("orderProviders serialises the order payload", async () => {
    let args: Record<string, unknown> | undefined;
    const adapter = fakeAdapter({
      async rpc<T>(_n: string, a?: Record<string, unknown>) {
        args = a;
        return { data: { updated: 2 } as T, error: null };
      },
    });
    const res = await new AiRepository(ctx(adapter)).orderProviders({
      order: [{ keySlug: "gemini" }, { keySlug: "groq" }],
    });
    expect(res.ok).toBe(true);
    expect(args).toEqual({ p_order: JSON.stringify([{ key_slug: "gemini" }, { key_slug: "groq" }]) });
  });

  it("logUsage is staff-only (student denied)", async () => {
    const res = await new AiRepository(ctx(fakeAdapter(), student())).logUsage({ action: "aiAsk" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("forbidden");
  });

  it("usageTotals has no RBAC pre-check (scoped in RPC)", async () => {
    const adapter = fakeAdapter({
      async rpc<T>() {
        return { data: { calls: 3, cost: 0.01 } as T, error: null };
      },
    });
    const res = await new AiRepository(ctx(adapter, student())).usageTotals({});
    expect(res.ok).toBe(true);
  });
});
