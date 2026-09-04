"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { enrolStudentAction, type AcademicActionState } from "@/lib/actions/academic";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Select } from "@/components/ui/input";
import type { Option } from "./class-create-form";

export function ClassEnrolStudentForm({
  classId,
  students,
}: {
  classId: string;
  students: Option[];
}) {
  const [t, commonT] = [useTranslations("academic"), useTranslations("common")];
  const [state, formAction, pending] = useActionState<AcademicActionState | null, FormData>(
    enrolStudentAction,
    null,
  );
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.ok, router]);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="classId" value={classId} />
      <Field label={commonT("student")} htmlFor="studentId" className="min-w-48">
        <Select id="studentId" name="studentId" required defaultValue="">
          <option value="" disabled>{t("selectStudent")}</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </Select>
      </Field>
      <Button type="submit" loading={pending}>{t("enrol")}</Button>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
    </form>
  );
}
