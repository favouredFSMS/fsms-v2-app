import { env } from "@/lib/env";

/**
 * FSMS V2 — translation-provider abstraction (owner decision O3).
 *
 * STATIC UI strings never call a provider — they come from FSMS translation
 * catalogs (next-intl, en/ru/fr/zh). This interface is ONLY for DYNAMIC
 * content (teacher-created descriptions, homework instructions, announcements,
 * comments, selected curriculum content). Google Translate is the initial
 * implementation; a future provider can be substituted without redesign.
 *
 * Original content is never overwritten: translations are cached keyed by
 * content hash + locale (see `content_translations` table and
 * `fsms.resolve_translation` / `fsms.save_translation`).
 */

export type AppLocale = "en" | "ru" | "fr" | "zh";

export interface TranslationProvider {
  /** Translate text, or return null when no provider is configured / it fails. */
  translate(text: string, targetLocale: AppLocale): Promise<string | null>;
}

/** No provider configured: dynamic content is returned untranslated. */
export class NoopTranslationProvider implements TranslationProvider {
  async translate(_text: string, _targetLocale: AppLocale): Promise<null> {
    return null;
  }
}

/** Google BCP-47 target for an FSMS locale (zh → zh-CN). */
function googleTarget(locale: AppLocale): string {
  return locale === "zh" ? "zh-CN" : locale;
}

/**
 * Google Translate provider (O3) — Cloud Translation v2.
 *
 * Fail-open: any error (missing key, network, quota) returns null so callers
 * fall back to the original content. Never throws into the request path.
 */
export class GoogleTranslationProvider implements TranslationProvider {
  async translate(text: string, targetLocale: AppLocale): Promise<string | null> {
    const key = env.googleTranslateApiKey;
    if (!key || !text.trim()) return null;

    const url =
      "https://translation.googleapis.com/language/translate/v2" +
      `?key=${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        target: googleTarget(targetLocale),
        format: "text",
      }),
    });
    if (!res.ok) return null;

    const json = (await res.json()) as {
      data?: { translations?: Array<{ translatedText?: string }> };
    };
    const translated = json.data?.translations?.[0]?.translatedText;
    return translated && translated.length ? translated : null;
  }
}

export function getTranslationProvider(): TranslationProvider {
  return env.googleTranslateApiKey
    ? new GoogleTranslationProvider()
    : new NoopTranslationProvider();
}
