"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { saveLessonPlanAction, type LessonActionState } from "@/lib/actions/lessons";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";

export function LessonPlanForm({
  classes,
  lessons,
}: {
  classes: Array<{ id: string; name: string | null }>;
  lessons: Array<{ id: string; label: string }>;
}) {
  const [state, formAction, pending] = useActionState<LessonActionState | null, FormData>(
    saveLessonPlanAction,
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
        <Field label="Lesson (optional)" htmlFor="lessonId">
          <Select id="lessonId" name="lessonId" defaultValue="">
            <option value="">(no specific lesson)</option>
            {lessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Plan" htmlFor="plan" className="sm:col-span-2">
          <Textarea
            id="plan"
            name="plan"
            rows={5}
            placeholder="Warm-up, main activity, wrap-up…"
          />
        </Field>
        <Field label="Source" htmlFor="source" className="sm:col-span-2">
          <Input id="source" name="source" placeholder="Textbook, self-made, imported…" />
        </Field>
      </div>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save plan"}
        </Button>
      </div>
    </form>
  );
}
