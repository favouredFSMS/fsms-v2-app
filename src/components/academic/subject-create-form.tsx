"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createSubjectAction, type AcademicActionState } from "@/lib/actions/academic";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function SubjectCreateForm() {
  const [state, formAction, pending] = useActionState<AcademicActionState | null, FormData>(
    createSubjectAction,
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
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
      <Field label="Subject name" htmlFor="name" required>
        <Input id="name" name="name" required placeholder="Science" />
      </Field>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      {state?.ok && <p className="text-sm text-success-600">Subject added.</p>}
      <Button type="submit" loading={pending}>
        Add subject
      </Button>
    </form>
  );
}
