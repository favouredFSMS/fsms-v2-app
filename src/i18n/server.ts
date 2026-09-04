import "server-only";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, normaliseLocale, type AppLocale } from "./locales";

type Messages = Record<string, unknown>;

const cache = new Map<AppLocale, Messages>();

/** Load the message catalog for a locale (module-level cache, immutable data). */
export async function loadMessages(locale: AppLocale): Promise<Messages> {
  const hit = cache.get(locale);
  if (hit) return hit;
  const mod = (await import(`../../messages/${locale}.json`)) as { default: Messages };
  cache.set(locale, mod.default);
  return mod.default;
}

/**
 * Resolve the request locale from the `fsms_locale` cookie (falls back to en).
 * Used by server actions to localise the error messages they return.
 */
export async function requestLocale(): Promise<AppLocale> {
  const store = await cookies();
  return normaliseLocale(store.get(LOCALE_COOKIE)?.value);
}

function lookup(messages: Messages, path: string): string | undefined {
  let node: unknown = messages;
  for (const part of path.split(".")) {
    if (node == null || typeof node !== "object") return undefined;
    node = (node as Messages)[part];
  }
  return typeof node === "string" ? node : undefined;
}

/**
 * Server-side translation for a dotted key (e.g. "auth.invalidCredentials"),
 * with optional ICU-style `{name}` interpolation. Returns the key itself when
 * the message is missing (never throws).
 */
export async function translate(
  key: string,
  vars?: Record<string, string | number>,
): Promise<string> {
  const locale = await requestLocale();
  const messages = await loadMessages(locale);
  let text = lookup(messages, key) ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}
