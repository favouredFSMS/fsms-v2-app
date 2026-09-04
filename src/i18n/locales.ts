/**
 * FSMS V2 — Phase 24 internationalization constants (shared server/client).
 *
 * UI language is PER-USER (stored on `profiles.locale`, mirrored in the
 * `fsms_locale` cookie for request-time resolution). URLs are NOT
 * locale-prefixed: the app is a single-tenant-per-user experience where each
 * signed-in user sees their own language (see Phase 8 auth design).
 */

export const LOCALES = ["en", "ru", "fr", "zh"] as const;

export type AppLocale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "en";

/** Canonical display names (native endonyms) for the selector UI. */
export const LOCALE_LABELS: Record<AppLocale, string> = {
  en: "English",
  ru: "Русский",
  fr: "Français",
  zh: "中文",
};

export const LOCALE_COOKIE = "fsms_locale";

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}

/** Normalise an arbitrary value to a supported locale (fallback: en). */
export function normaliseLocale(value: string | null | undefined): AppLocale {
  return isAppLocale(value) ? value : DEFAULT_LOCALE;
}
