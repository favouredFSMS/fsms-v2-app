"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { recordAssessmentTestAction, type AssessmentActionState } from "@/lib/actions/assessments";
import { Button } from "@/components/ui/button";
import { Field, FieldError, Hint } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";

export function AssessmentRecordForm({
  tests,
}: {
  tests: Array<{ id: string; label: string; taskCount: number | null }>;
}) {
  const [t, commonT] = [useTranslations("assessments"), useTranslations("common")];
  const [state, formAction, pending] = useActionState<AssessmentActionState | null, FormData>(
    recordAssessmentTestAction,
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
        <Field label={commonT("test")} htmlFor="testId" required>
          <Select id="testId" name="testId" required defaultValue="">
            <option value="" disabled>
              {t("selectTest")}
            </option>
            {tests.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("correctTasks")} htmlFor="correctTasks">
          <Input id="correctTasks" name="correctTasks" placeholder="1, 3" />
        </Field>
      </div>
      <Hint>{t("scoreHint")}</Hint>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? t("recording") : t("recordResult")}
        </Button>
      </div>
    </form>
  );
}
