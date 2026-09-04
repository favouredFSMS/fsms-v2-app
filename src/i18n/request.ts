import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, normaliseLocale } from "./locales";

/**
 * FSMS V2 — per-request i18n configuration (without locale-prefixed routing).
 *
 * The locale comes from the `fsms_locale` cookie, which the language switcher
 * keeps in sync with `profiles.locale` (the durable per-user setting). No
 * cookie yet (e.g. first request / login page) → fall back to English, the
 * master language. Unknown values are normalised to `en` (fallback behavior).
 */
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = normaliseLocale(cookieStore.get(LOCALE_COOKIE)?.value);

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
