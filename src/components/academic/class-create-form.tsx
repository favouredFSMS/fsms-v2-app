"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
        <Field label="Class name" htmlFor="name" required>
          <Input id="name" name="name" required placeholder="A2 Kids" />
        </Field>
        <Field label="Level" htmlFor="levelCode">
          <Select id="levelCode" name="levelCode" defaultValue="">
            <option value="">— none —</option>
            {levels.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label ?? l.code.toUpperCase()}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Class type" htmlFor="classType">
          <Input id="classType" name="classType" defaultValue="group" placeholder="group" />
        </Field>
        <Field label="Learner type" htmlFor="learnerType">
          <Select id="learnerType" name="learnerType" defaultValue="">
            <option value="">— none —</option>
            {LEARNER_TYPES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </Select>
        </Field>
        <Field label="Room" htmlFor="room">
          <Input id="room" name="room" placeholder="Room 3" />
        </Field>
        <Field label="Academic year" htmlFor="academicYearId">
          <Select id="academicYearId" name="academicYearId" defaultValue="">
            <option value="">— none —</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Term" htmlFor="termId">
          <Select id="termId" name="termId" defaultValue="">
            <option value="">— none —</option>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </Select>
        </Field>
      </div>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      {state?.ok && <p className="text-sm text-success-600">Class created.</p>}
      <Button type="submit" loading={pending} className="self-start">
        Create class
      </Button>
    </form>
  );
}
