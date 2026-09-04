"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createTermAction, type AcademicActionState } from "@/lib/actions/academic";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import type { Option } from "./class-create-form";

export function TermCreateForm({ years }: { years: Option[] }) {
  const [t, commonT] = [useTranslations("academic"), useTranslations("common")];
  const [state, formAction, pending] = useActionState<AcademicActionState | null, FormData>(
    createTermAction,
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
        <Field label={t("academicYear")} htmlFor="academicYearId" required>
          <Select id="academicYearId" name="academicYearId" required defaultValue="">
            <option value="" disabled>{t("selectYear")}</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </Select>
        </Field>
        <Field label={commonT("termName")} htmlFor="name" required>
          <Input id="name" name="name" required placeholder="Term 1" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={commonT("startsOn")} htmlFor="startsOn">
            <Input id="startsOn" name="startsOn" type="date" />
          </Field>
          <Field label={commonT("endsOn")} htmlFor="endsOn">
            <Input id="endsOn" name="endsOn" type="date" />
          </Field>
        </div>
      </div>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      {state?.ok && <p className="text-sm text-success-600">{t("termAdded")}</p>}
      <Button type="submit" loading={pending} className="self-start">
        {t("addTerm")}
      </Button>
    </form>
  );
}
