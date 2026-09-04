"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { saveAssessmentAction, type AssessmentActionState } from "@/lib/actions/assessments";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";

export function AssessmentMarkForm({
  students,
}: {
  students: Array<{ id: string; name: string | null }>;
}) {
  const [t, commonT] = [useTranslations("assessments"), useTranslations("common")];
  const [state, formAction, pending] = useActionState<AssessmentActionState | null, FormData>(
    saveAssessmentAction,
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
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={commonT("student")} htmlFor="studentId" required>
          <Select id="studentId" name="studentId" required defaultValue="">
            <option value="" disabled>
              {t("selectStudent")}
            </option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name ?? s.id}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={commonT("type")} htmlFor="type">
          <Input id="type" name="type" placeholder={t("typePlaceholder")} />
        </Field>
        <Field label={commonT("date")} htmlFor="date">
          <Input id="date" name="date" type="date" />
        </Field>
        <Field label={commonT("title")} htmlFor="title" className="sm:col-span-2">
          <Input id="title" name="title" placeholder="Vocabulary quiz" />
        </Field>
        <Field label={commonT("score")} htmlFor="score">
          <Input id="score" name="score" type="number" min={0} step="any" />
        </Field>
        <Field label={commonT("maxScore")} htmlFor="maxScore">
          <Input id="maxScore" name="maxScore" type="number" min={0} step="any" />
        </Field>
        <Field label={commonT("note")} htmlFor="note" className="sm:col-span-3">
          <Textarea id="note" name="note" rows={2} placeholder="Optional note…" />
        </Field>
      </div>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? commonT("saving") : t("saveAssessment")}
        </Button>
      </div>
    </form>
  );
}
