"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { setLocaleAction } from "@/lib/actions/locale";
import { LOCALES, LOCALE_LABELS, type AppLocale } from "@/i18n/locales";
import { Icon } from "@/components/ui/icons";

/** Compact language selector: persists via server action + cookie, no logout. */
export function LanguageSwitcher() {
  const locale = useLocale();
  const [pending, start] = useTransition();
  const router = useRouter();

  function switchTo(next: AppLocale) {
    if (next === locale) return;
    start(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1" aria-label="Language">
      <Icon name="globe" size={16} className="text-ink-faint" />
      <select
        value={locale}
        disabled={pending}
        onChange={(e) => switchTo(e.target.value as AppLocale)}
        className="rounded-field border border-line-strong bg-surface px-2 py-1 text-sm text-ink-muted focus-ring disabled:opacity-60"
        aria-label="Select language"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l}>
            {LOCALE_LABELS[l]}
          </option>
        ))}
      </select>
    </div>
  );
}
