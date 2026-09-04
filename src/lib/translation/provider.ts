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
 * content hash + locale (see `content_translations` table, Phase 4 §14).
 */

export type AppLocale = "en" | "ru" | "fr" | "zh";

export interface TranslationProvider {
  /** Translate text, or return null when no provider is configured. */
  translate(text: string, targetLocale: AppLocale): Promise<string | null>;
}

/** No provider configured: dynamic content is returned untranslated. */
export class NoopTranslationProvider implements TranslationProvider {
  async translate(): Promise<null> {
    return null;
  }
}

/**
 * Google Translate provider (O3). The real Cloud Translation API call is wired
 * in Phase 21/24 behind this interface; until then it safely degrades to null
 * so callers fall back to the original content.
 */
export class GoogleTranslationProvider implements TranslationProvider {
  async translate(text: string, targetLocale: AppLocale): Promise<string | null> {
    if (!env.googleTranslateApiKey) return null;
    // TODO(Phase 24): implement Cloud Translation v2 call + content_translations cache.
    void text;
    void targetLocale;
    return null;
  }
}

export function getTranslationProvider(): TranslationProvider {
  return env.googleTranslateApiKey
    ? new GoogleTranslationProvider()
    : new NoopTranslationProvider();
}
