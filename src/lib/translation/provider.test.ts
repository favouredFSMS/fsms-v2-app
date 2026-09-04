import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GoogleTranslationProvider,
  NoopTranslationProvider,
  getTranslationProvider,
} from "./provider";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("NoopTranslationProvider", () => {
  it("always returns null", async () => {
    await expect(new NoopTranslationProvider().translate("hi", "fr")).resolves.toBeNull();
  });
});

describe("getTranslationProvider", () => {
  it("returns Noop when no key configured", () => {
    vi.stubEnv("GOOGLE_TRANSLATE_API_KEY", "");
    expect(getTranslationProvider()).toBeInstanceOf(NoopTranslationProvider);
  });

  it("returns Google when a key is configured", () => {
    vi.stubEnv("GOOGLE_TRANSLATE_API_KEY", "test-key");
    expect(getTranslationProvider()).toBeInstanceOf(GoogleTranslationProvider);
  });
});

describe("GoogleTranslationProvider", () => {
  it("returns null without a key", async () => {
    vi.stubEnv("GOOGLE_TRANSLATE_API_KEY", "");
    await expect(new GoogleTranslationProvider().translate("hi", "fr")).resolves.toBeNull();
  });

  it("translates via the Cloud Translation v2 API", async () => {
    vi.stubEnv("GOOGLE_TRANSLATE_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ data: { translations: [{ translatedText: "bonjour" }] } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const out = await new GoogleTranslationProvider().translate("hello", "fr");
    expect(out).toBe("bonjour");
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("translation.googleapis.com/language/translate/v2");
    expect(url).toContain("key=test-key");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.target).toBe("fr");
  });

  it("maps zh → zh-CN", async () => {
    vi.stubEnv("GOOGLE_TRANSLATE_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ data: { translations: [{ translatedText: "你好" }] } }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await new GoogleTranslationProvider().translate("hello", "zh");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.target).toBe("zh-CN");
  });

  it("returns null on API error (fail-open)", async () => {
    vi.stubEnv("GOOGLE_TRANSLATE_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 403 })));

    await expect(new GoogleTranslationProvider().translate("hello", "fr")).resolves.toBeNull();
  });

  it("returns null on empty input", async () => {
    vi.stubEnv("GOOGLE_TRANSLATE_API_KEY", "test-key");
    await expect(new GoogleTranslationProvider().translate("   ", "fr")).resolves.toBeNull();
  });
});
