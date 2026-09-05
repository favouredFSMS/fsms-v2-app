import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_LOCALE, LOCALES, isAppLocale, normaliseLocale } from "./locales";

function getFlattenedKeys(obj: unknown, prefix = ""): string[] {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return [];
  const keys: string[] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      keys.push(...getFlattenedKeys(v, full));
    } else {
      keys.push(full);
    }
  }
  return keys;
}

function loadCatalog(locale: string): Record<string, unknown> {
  const catalogPath = resolve(__dirname, `../../messages/${locale}.json`);
  return JSON.parse(readFileSync(catalogPath, "utf-8"));
}

describe("i18n locales", () => {
  it("recognises the four supported locales", () => {
    expect(LOCALES).toEqual(["en", "ru", "fr", "zh"]);
    for (const l of LOCALES) expect(isAppLocale(l)).toBe(true);
  });

  it("rejects unsupported / nullish / empty values", () => {
    expect(isAppLocale("de")).toBe(false);
    expect(isAppLocale(null)).toBe(false);
    expect(isAppLocale(undefined)).toBe(false);
    expect(isAppLocale("")).toBe(false);
    expect(isAppLocale("EN")).toBe(false);
  });

  it("normalises valid locales through unchanged", () => {
    expect(normaliseLocale("ru")).toBe("ru");
    expect(normaliseLocale("fr")).toBe("fr");
    expect(normaliseLocale("zh")).toBe("zh");
  });

  it("falls back to the default locale (en) for anything else", () => {
    expect(normaliseLocale("de")).toBe(DEFAULT_LOCALE);
    expect(normaliseLocale(null)).toBe(DEFAULT_LOCALE);
    expect(normaliseLocale(undefined)).toBe(DEFAULT_LOCALE);
    expect(normaliseLocale("")).toBe(DEFAULT_LOCALE);
    expect(DEFAULT_LOCALE).toBe("en");
  });

  it("guarantees 100% key parity across all 4 message catalogs (EN, RU, FR, ZH)", () => {
    const enKeys = getFlattenedKeys(loadCatalog("en")).sort();
    expect(enKeys.length).toBeGreaterThan(1000);

    for (const locale of ["ru", "fr", "zh"] as const) {
      const locKeys = getFlattenedKeys(loadCatalog(locale)).sort();
      expect(locKeys).toEqual(enKeys);
    }
  });
});

