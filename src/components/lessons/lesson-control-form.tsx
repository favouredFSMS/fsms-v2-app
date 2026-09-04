"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { saveLessonControlAction, type LessonActionState } from "@/lib/actions/lessons";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";

export function LessonControlForm({
  classes,
}: {
  classes: Array<{ id: string; name: string | null }>;
}) {
  const [state, formAction, pending] = useActionState<LessonActionState | null, FormData>(
    saveLessonControlAction,
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
        <Field label="Class" htmlFor="classId" required>
          <Select id="classId" name="classId" required defaultValue="">
            <option value="" disabled>
              Select class…
            </option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name ?? c.id}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Key" htmlFor="key" required>
          <Input id="key" name="key" placeholder="lessonStatus" />
        </Field>
        <Field label="Value" htmlFor="value">
          <Input id="value" name="value" placeholder="PREPARED" />
        </Field>
      </div>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save control"}
        </Button>
      </div>
    </form>
  );
}
