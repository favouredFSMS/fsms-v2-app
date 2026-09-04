"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { saveAssessmentTestAction, type AssessmentActionState } from "@/lib/actions/assessments";
import { Button } from "@/components/ui/button";
import { Field, FieldError, Hint } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";

export function AssessmentTestForm({
  students,
}: {
  students: Array<{ id: string; name: string | null }>;
}) {
  const [t, commonT] = [useTranslations("assessments"), useTranslations("common")];
  const [state, formAction, pending] = useActionState<AssessmentActionState | null, FormData>(
    saveAssessmentTestAction,
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
        <Field label={commonT("title")} htmlFor="title" required>
          <Input id="title" name="title" required placeholder="Monthly assessment" />
        </Field>
        <Field label={commonT("difficulty")} htmlFor="difficulty">
          <Select id="difficulty" name="difficulty" defaultValue="standard">
            <option value="standard">standard</option>
            <option value="easy">easy</option>
            <option value="hard">hard</option>
          </Select>
        </Field>
        <Field label={commonT("mode")} htmlFor="mode">
          <Select id="mode" name="mode" defaultValue="manual">
            <option value="manual">manual</option>
            <option value="ai">ai</option>
            <option value="hybrid">hybrid</option>
          </Select>
        </Field>
        <Field label={t("typesLabel")} htmlFor="types" className="sm:col-span-2">
          <Input id="types" name="types" placeholder="reading, listening" />
        </Field>
        <Field label={t("tasksJson")} htmlFor="tasks" className="sm:col-span-2" required>
          <Textarea
            id="tasks"
            name="tasks"
            rows={5}
            placeholder='[{"n":1,"skill":"reading","text":"Read and answer"}]'
          />
          <Hint>{t("eachTaskHint")}</Hint>
        </Field>
      </div>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? commonT("saving") : t("createAssessmentTest")}
        </Button>
      </div>
    </form>
  );
}
