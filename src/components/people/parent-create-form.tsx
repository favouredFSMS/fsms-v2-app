"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createParentAction, type PeopleActionState } from "@/lib/actions/people";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ParentCreateForm() {
  const [state, formAction, pending] = useActionState<PeopleActionState | null, FormData>(
    createParentAction,
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
        <Field label="Full name" htmlFor="name" required>
          <Input id="name" name="name" required placeholder="Parent name" />
        </Field>
        <Field label="Phone" htmlFor="phone">
          <Input id="phone" name="phone" placeholder="+7 …" />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" name="email" type="email" placeholder="parent@example.org" />
        </Field>
      </div>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      {state?.ok && <p className="text-sm text-success-600">Parent created.</p>}
      <Button type="submit" loading={pending} className="self-start">
        Add parent
      </Button>
    </form>
  );
}
