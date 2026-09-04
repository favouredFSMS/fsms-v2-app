"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createYearAction, type AcademicActionState } from "@/lib/actions/academic";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function YearCreateForm() {
  const [state, formAction, pending] = useActionState<AcademicActionState | null, FormData>(
    createYearAction,
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
        <Field label="Year name" htmlFor="name" required>
          <Input id="name" name="name" required placeholder="2026/27" />
        </Field>
        <Field label="Starts on" htmlFor="startsOn">
          <Input id="startsOn" name="startsOn" type="date" />
        </Field>
        <Field label="Ends on" htmlFor="endsOn">
          <Input id="endsOn" name="endsOn" type="date" />
        </Field>
      </div>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      {state?.ok && <p className="text-sm text-success-600">Academic year added.</p>}
      <Button type="submit" loading={pending} className="self-start">
        Add year
      </Button>
    </form>
  );
}
