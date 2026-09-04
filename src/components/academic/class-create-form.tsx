"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClassAction, type AcademicActionState } from "@/lib/actions/academic";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";

export interface Option {
  id: string;
  name: string | null;
}

const LEARNER_TYPES = ["children", "teenagers", "adults", "general"];

export function ClassCreateForm({
  levels,
  years,
  terms,
}: {
  levels: Array<{ code: string; label: string | null }>;
  years: Option[];
  terms: Option[];
}) {
  const [t, commonT] = [useTranslations("academic"), useTranslations("common")];
  const [state, formAction, pending] = useActionState<AcademicActionState | null, FormData>(
    createClassAction,
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
        <Field label={commonT("className")} htmlFor="name" required>
          <Input id="name" name="name" required placeholder="A2 Kids" />
        </Field>
        <Field label={commonT("level")} htmlFor="levelCode">
          <Select id="levelCode" name="levelCode" defaultValue="">
            <option value="">{t("noneOption")}</option>
            {levels.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label ?? l.code.toUpperCase()}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={commonT("classType")} htmlFor="classType">
          <Input id="classType" name="classType" defaultValue="group" placeholder="group" />
        </Field>
        <Field label={commonT("learnerType")} htmlFor="learnerType">
          <Select id="learnerType" name="learnerType" defaultValue="">
            <option value="">{t("noneOption")}</option>
            {LEARNER_TYPES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </Select>
        </Field>
        <Field label={commonT("room")} htmlFor="room">
          <Input id="room" name="room" placeholder="Room 3" />
        </Field>
        <Field label={t("academicYear")} htmlFor="academicYearId">
          <Select id="academicYearId" name="academicYearId" defaultValue="">
            <option value="">{t("noneOption")}</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </Select>
        </Field>
        <Field label={commonT("term")} htmlFor="termId">
          <Select id="termId" name="termId" defaultValue="">
            <option value="">{t("noneOption")}</option>
            {terms.map((tm) => (
              <option key={tm.id} value={tm.id}>{tm.name}</option>
            ))}
          </Select>
        </Field>
      </div>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      {state?.ok && <p className="text-sm text-success-600">{t("classCreated")}</p>}
      <Button type="submit" loading={pending} className="self-start">
        {t("createClass")}
      </Button>
    </form>
  );
}
