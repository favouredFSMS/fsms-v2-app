"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { requestLessonChangeAction, type LessonActionState } from "@/lib/actions/lessons";
import { Button } from "@/components/ui/button";
import { Field, FieldError, Hint } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";

export function LessonChangeRequestForm({
  classes,
}: {
  classes: Array<{ id: string; name: string | null }>;
}) {
  const [t, commonT] = [useTranslations("lessons"), useTranslations("common")];
  const [state, formAction, pending] = useActionState<LessonActionState | null, FormData>(
    requestLessonChangeAction,
    null,
  );
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state?.ok, router]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={commonT("class")} htmlFor="classId" required>
          <Select id="classId" name="classId" required defaultValue="">
            <option value="" disabled>
              {t("selectClass")}
            </option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name ?? c.id}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("fromDate")} htmlFor="fromDate" required>
          <Input id="fromDate" name="fromDate" type="date" required />
        </Field>
        <Field label={t("newDate")} htmlFor="toDate">
          <Input id="toDate" name="toDate" type="date" />
        </Field>
        <div className="flex items-end pb-1">
          <Hint>{t("cancellationHint")}</Hint>
        </div>
        <Field label={commonT("reason")} htmlFor="reason" className="sm:col-span-2" required>
          <Textarea id="reason" name="reason" rows={3} placeholder="Why should this lesson move?" />
        </Field>
      </div>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? commonT("sending") : t("requestChange")}
        </Button>
      </div>
    </form>
  );
}
