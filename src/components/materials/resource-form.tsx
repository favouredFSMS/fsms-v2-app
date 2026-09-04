"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { saveResourceAction, type MaterialActionState } from "@/lib/actions/materials";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ResourceForm() {
  const [state, formAction, pending] = useActionState<MaterialActionState | null, FormData>(
    saveResourceAction,
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
        <Field label="Title" htmlFor="title" required>
          <Input id="title" name="title" required placeholder="Reading worksheet" />
        </Field>
        <Field label="URL" htmlFor="url">
          <Input id="url" name="url" placeholder="https://…" />
        </Field>
        <Field label="Kind" htmlFor="kind">
          <Input id="kind" name="kind" placeholder="worksheet" />
        </Field>
      </div>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Add resource"}
        </Button>
      </div>
    </form>
  );
}
