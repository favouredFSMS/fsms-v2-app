import { afterEach, describe, expect, it, vi } from "vitest";

// Neutralise the react-server guard for the test environment.
vi.mock("server-only", () => ({}));

import { contentHash, translateDynamicContent } from "./service";
import type { DbContext } from "@/lib/db/context";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function makeCtx(rpc: ReturnType<typeof vi.fn>): DbContext {
  return {
    profile: {
      id: "u1",
      school_id: "s1",
      email: "a@b.c",
      name: null,
      role_id: null,
      role_base: "admin",
      role_key: null,
      role_label: null,
      rank: 0,
      locale: "en",
      notify_lang: "en",
      status: "active",
      must_change_password: false,
      linked_ids: [],
      permissions: ["*"],
    },
    db: { rpc } as unknown as DbContext["db"],
  };
}

describe("contentHash", () => {
  it("is deterministic and distinct", () => {
    expect(contentHash("a")).toBe(contentHash("a"));
    expect(contentHash("a")).not.toBe(contentHash("b"));
    expect(contentHash("a")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("translateDynamicContent", () => {
  it("returns null for empty text without touching the provider", async () => {
    const rpc = vi.fn();
    await expect(translateDynamicContent(makeCtx(rpc), "  ", "fr")).resolves.toBeNull();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("serves from cache without calling the provider", async () => {
    vi.stubEnv("GOOGLE_TRANSLATE_API_KEY", "test-key");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const rpc = vi.fn().mockResolvedValue({ data: { translated: "cached" }, error: null });

    const out = await translateDynamicContent(makeCtx(rpc), "hello", "fr");
    expect(out).toBe("cached");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(rpc.mock.calls[0][0]).toBe("resolve_translation");
  });

  it("returns null when cache misses and no provider key is set", async () => {
    vi.stubEnv("GOOGLE_TRANSLATE_API_KEY", "");
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });

    await expect(translateDynamicContent(makeCtx(rpc), "hello", "fr")).resolves.toBeNull();
  });

  it("translates on cache miss and persists the result", async () => {
    vi.stubEnv("GOOGLE_TRANSLATE_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ data: { translations: [{ translatedText: "bonjour" }] } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });

    const out = await translateDynamicContent(makeCtx(rpc), "hello", "fr");
    expect(out).toBe("bonjour");
    const saveCall = rpc.mock.calls.find((c) => c[0] === "save_translation");
    expect(saveCall).toBeTruthy();
    expect((saveCall![1] as { p_fields: { translated: string } }).p_fields.translated).toBe(
      "bonjour",
    );
  });
});
