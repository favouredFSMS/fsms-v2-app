import { defineRouting } from "next-intl/routing";
import { DEFAULT_LOCALE, LOCALES } from "./locales";

/**
 * Routing declaration for next-intl. Locale-prefixed URLs are disabled
 * (`localePrefix: "never"`): the UI language is per-user and resolved from the
 * profile/cookie, so paths stay clean (/dashboard, /students, …).
 */
export const routing = defineRouting({
  locales: [...LOCALES],
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: "never",
});
