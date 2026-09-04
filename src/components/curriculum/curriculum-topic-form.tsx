"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { saveTopicAction, type CurriculumActionState } from "@/lib/actions/curriculum";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";

export function CurriculumTopicForm() {
  const [state, formAction, pending] = useActionState<CurriculumActionState | null, FormData>(
    saveTopicAction,
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
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Topic title" htmlFor="title" required>
          <Input id="title" name="title" required placeholder="Present simple: daily routines" />
        </Field>
        <Field label="Level" htmlFor="levelCode">
          <Input id="levelCode" name="levelCode" placeholder="a2" />
        </Field>
        <Field label="Course section" htmlFor="courseSection">
          <Input id="courseSection" name="courseSection" placeholder="grammar" />
        </Field>
        <Field label="Publish" htmlFor="published">
          <Select id="published" name="published" defaultValue="false">
            <option value="false">Draft</option>
            <option value="true">Published</option>
          </Select>
        </Field>
      </div>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save topic"}
        </Button>
      </div>
    </form>
  );
}
