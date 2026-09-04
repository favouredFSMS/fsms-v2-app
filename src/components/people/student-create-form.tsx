"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createStudentAction, type PeopleActionState } from "@/lib/actions/people";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";

const LEVELS = ["prea1", "a1", "a2", "b1", "b2", "c1", "c2"];

export function StudentCreateForm() {
  const [t, commonT] = [useTranslations("students"), useTranslations("common")];
  const [state, formAction, pending] = useActionState<PeopleActionState | null, FormData>(
    createStudentAction,
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
        <Field label={commonT("fullName")} htmlFor="name" required>
          <Input id="name" name="name" required placeholder="Jane Doe" />
        </Field>
        <Field label={t("studentNo")} htmlFor="student_no">
          <Input id="student_no" name="student_no" placeholder="S-010" />
        </Field>
        <Field label={commonT("level")} htmlFor="level_code">
          <Select id="level_code" name="level_code" defaultValue="">
            <option value="">{commonT("noneOption")}</option>
            {LEVELS.map((l) => (
              <option key={l} value={l}>{l.toUpperCase()}</option>
            ))}
          </Select>
        </Field>
      </div>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      {state?.ok && <p className="text-sm text-success-600">{t("studentCreated")}</p>}
      <Button type="submit" loading={pending} className="self-start">
        {t("addStudent")}
      </Button>
    </form>
  );
}
