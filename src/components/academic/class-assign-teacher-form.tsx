"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { assignTeacherAction, type AcademicActionState } from "@/lib/actions/academic";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Select } from "@/components/ui/input";
import type { Option } from "./class-create-form";

export function ClassAssignTeacherForm({
  classId,
  teachers,
}: {
  classId: string;
  teachers: Option[];
}) {
  const [t, commonT] = [useTranslations("academic"), useTranslations("common")];
  const [state, formAction, pending] = useActionState<AcademicActionState | null, FormData>(
    assignTeacherAction,
    null,
  );
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.ok, router]);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="classId" value={classId} />
      <Field label={commonT("teacher")} htmlFor="userId" className="min-w-48">
        <Select id="userId" name="userId" required defaultValue="">
          <option value="" disabled>{t("selectTeacher")}</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </Select>
      </Field>
      <label className="flex items-center gap-2 pb-2 text-sm text-ink-muted">
        <input type="checkbox" name="primary" className="accent-brand-600" />
        {t("primaryTeacher")}
      </label>
      <Button type="submit" loading={pending}>{commonT("assign")}</Button>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
    </form>
  );
}
