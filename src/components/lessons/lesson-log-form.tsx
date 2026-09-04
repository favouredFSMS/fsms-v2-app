"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { saveLessonLogAction, type LessonActionState } from "@/lib/actions/lessons";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";

export function LessonLogForm({ classes }: { classes: Array<{ id: string; name: string | null }> }) {
  const [state, formAction, pending] = useActionState<LessonActionState | null, FormData>(
    saveLessonLogAction,
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
        <Field label="Date" htmlFor="date" required>
          <Input id="date" name="date" type="date" required />
        </Field>
        <Field label="Lesson number" htmlFor="lessonNo">
          <Input id="lessonNo" name="lessonNo" type="number" min={1} />
        </Field>
        <Field label="Topic" htmlFor="topic">
          <Input id="topic" name="topic" placeholder="Greetings and introductions" />
        </Field>
        <Field label="Participation" htmlFor="participation">
          <Input id="participation" name="participation" placeholder="All present" />
        </Field>
        <Field label="Duration (minutes)" htmlFor="durationMin">
          <Input id="durationMin" name="durationMin" type="number" min={1} />
        </Field>
        <Field label="Teacher note" htmlFor="teacherNote" className="sm:col-span-2">
          <Textarea id="teacherNote" name="teacherNote" placeholder="What worked, what to review next…" />
        </Field>
      </div>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save lesson record"}
        </Button>
      </div>
    </form>
  );
}
