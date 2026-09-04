"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { savePrefsAction, type CommsActionState } from "@/lib/actions/comms";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import type { NotificationPrefs } from "@/lib/db";

export function PrefsForm({ prefs }: { prefs: NotificationPrefs | null }) {
  const [t, commonT] = [useTranslations("notifications"), useTranslations("common")];
  const [state, formAction, pending] = useActionState<CommsActionState | null, FormData>(savePrefsAction, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.ok, router]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" name="inAppEnabled" defaultChecked={prefs?.in_app_enabled ?? true} />
        {t("inAppNotifications")}
      </label>
      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" name="emailEnabled" defaultChecked={prefs?.email_enabled ?? true} />
        {t("emailNotifications")}
      </label>
      <p className="text-xs text-ink-500">
        {t("notifyLangNote", { lang: prefs?.notify_lang ?? commonT("none") })}
      </p>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? commonT("saving") : t("savePreferences")}
        </Button>
      </div>
    </form>
  );
}
