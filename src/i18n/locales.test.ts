import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, LOCALES, isAppLocale, normaliseLocale } from "./locales";

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
});
