"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { savePrefsAction, type CommsActionState } from "@/lib/actions/comms";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import type { NotificationPrefs } from "@/lib/db";

export function PrefsForm({ prefs }: { prefs: NotificationPrefs | null }) {
  const [state, formAction, pending] = useActionState<CommsActionState | null, FormData>(savePrefsAction, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.ok, router]);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" name="inAppEnabled" defaultChecked={prefs?.in_app_enabled ?? true} />
        In-app notifications
      </label>
      <label className="flex items-center gap-2 text-sm text-ink-700">
        <input type="checkbox" name="emailEnabled" defaultChecked={prefs?.email_enabled ?? true} />
        Email notifications
      </label>
      <p className="text-xs text-ink-500">
        Notification language: {prefs?.notify_lang ?? "not set (defaults to your account language)"}. Email
        delivery is sent in this language when a provider is configured.
      </p>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save preferences"}
        </Button>
      </div>
    </form>
  );
}
