"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  removeSettingAction,
  saveSettingAction,
  type SettingsActionState,
} from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";

/** Phase 31 UAT — add/edit a key/value setting. */
export function SettingsEditor() {
  const t = useTranslations("settings");
  const router = useRouter();
  const [state, formAction, pending] = useActionState<SettingsActionState | null, FormData>(
    saveSettingAction,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state?.ok, router]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={t("key")} htmlFor="key" required>
          <Input id="key" name="key" required placeholder="greetingBubbles" />
        </Field>
        <Field label={t("value")} htmlFor="value" required>
          <Input id="value" name="value" required placeholder="true" />
        </Field>
        <Field label={t("valueType")} htmlFor="valueType">
          <Select id="valueType" name="valueType" defaultValue="text" aria-label={t("valueType")}>
            <option value="text">{t("typeText")}</option>
            <option value="number">{t("typeNumber")}</option>
            <option value="boolean">{t("typeBoolean")}</option>
            <option value="json">{t("typeJson")}</option>
          </Select>
        </Field>
        <div className="flex items-end">
          <Button type="submit" disabled={pending}>
            {pending ? t("saving") : t("save")}
          </Button>
        </div>
      </div>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
    </form>
  );
}

/** Phase 31 UAT — inline remove button for one setting. */
export function SettingsRemoveForm({ settingKey }: { settingKey: string }) {
  const t = useTranslations("settings");
  const router = useRouter();
  const [state, formAction, pending] = useActionState<SettingsActionState | null, FormData>(
    removeSettingAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.ok, router]);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="key" value={settingKey} />
      {state && !state.ok && (
        <span className="text-xs text-danger-600">{state.message}</span>
      )}
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {t("remove")}
      </Button>
    </form>
  );
}
