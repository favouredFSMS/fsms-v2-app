"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { saveMaterialAction, type MaterialActionState } from "@/lib/actions/materials";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";

export function MaterialForm() {
  const [state, formAction, pending] = useActionState<MaterialActionState | null, FormData>(
    saveMaterialAction,
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
        <Field label="Title" htmlFor="title" required>
          <Input id="title" name="title" required placeholder="Family and Friends 2" />
        </Field>
        <Field label="Type" htmlFor="type">
          <Select id="type" name="type" defaultValue="textbook">
            <option value="textbook">Textbook</option>
            <option value="workbook">Workbook</option>
            <option value="reader">Reader</option>
            <option value="media">Media</option>
            <option value="other">Other</option>
          </Select>
        </Field>
        <Field label="Level" htmlFor="levelCode">
          <Input id="levelCode" name="levelCode" placeholder="a2" />
        </Field>
        <Field label="Publisher" htmlFor="publisher">
          <Input id="publisher" name="publisher" placeholder="Oxford" />
        </Field>
        <Field label="ISBN" htmlFor="isbn">
          <Input id="isbn" name="isbn" placeholder="978-0-19-..." />
        </Field>
        <Field label="Drive URL" htmlFor="driveUrl">
          <Input id="driveUrl" name="driveUrl" placeholder="https://drive.google.com/..." />
        </Field>
      </div>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Add material"}
        </Button>
      </div>
    </form>
  );
}
