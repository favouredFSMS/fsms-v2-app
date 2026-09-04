"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { saveAssessmentTestAction, type AssessmentActionState } from "@/lib/actions/assessments";
import { Button } from "@/components/ui/button";
import { Field, FieldError, Hint } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";

export function AssessmentTestForm({
  students,
}: {
  students: Array<{ id: string; name: string | null }>;
}) {
  const [state, formAction, pending] = useActionState<AssessmentActionState | null, FormData>(
    saveAssessmentTestAction,
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
        <Field label="Student" htmlFor="studentId" required>
          <Select id="studentId" name="studentId" required defaultValue="">
            <option value="" disabled>
              Select student…
            </option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name ?? s.id}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Title" htmlFor="title" required>
          <Input id="title" name="title" required placeholder="Monthly assessment" />
        </Field>
        <Field label="Difficulty" htmlFor="difficulty">
          <Select id="difficulty" name="difficulty" defaultValue="standard">
            <option value="standard">standard</option>
            <option value="easy">easy</option>
            <option value="hard">hard</option>
          </Select>
        </Field>
        <Field label="Mode" htmlFor="mode">
          <Select id="mode" name="mode" defaultValue="manual">
            <option value="manual">manual</option>
            <option value="ai">ai</option>
            <option value="hybrid">hybrid</option>
          </Select>
        </Field>
        <Field label="Types (comma-separated)" htmlFor="types" className="sm:col-span-2">
          <Input id="types" name="types" placeholder="reading, listening" />
        </Field>
        <Field label="Tasks (JSON array)" htmlFor="tasks" className="sm:col-span-2" required>
          <Textarea
            id="tasks"
            name="tasks"
            rows={5}
            placeholder='[{"n":1,"skill":"reading","text":"Read and answer"}]'
          />
          <Hint>Each task: {"{ n, skill, text }"}</Hint>
        </Field>
      </div>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Create assessment test"}
        </Button>
      </div>
    </form>
  );
}
