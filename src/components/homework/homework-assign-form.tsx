"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { assignHomeworkAction, type HomeworkActionState } from "@/lib/actions/homework";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function HomeworkAssignForm({
  classId,
  date,
  students,
}: {
  classId: string;
  date: string;
  students: Array<{ id: string; name: string | null }>;
}) {
  const [state, formAction, pending] = useActionState<HomeworkActionState | null, FormData>(
    assignHomeworkAction,
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

  const studentIds = JSON.stringify(students.map((s) => s.id));

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="studentIds" value={studentIds} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Title" htmlFor="title" required>
          <Input id="title" name="title" required placeholder="Workbook Unit 2" />
        </Field>
        <Field label="Due date" htmlFor="dueDate">
          <Input id="dueDate" name="dueDate" type="date" />
        </Field>
        <Field label="Note" htmlFor="note" className="sm:col-span-2">
          <Input id="note" name="note" placeholder="Optional instructions" />
        </Field>
      </div>

      <p className="text-xs text-ink-faint">
        Assigns to {students.length} active student{students.length === 1 ? "" : "s"}.
      </p>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      {state?.ok && <p className="text-sm text-success-600">Assigned to {state.created} student{state.created === 1 ? "" : "s"}.</p>}
      <Button type="submit" loading={pending} className="self-start">
        Assign homework
      </Button>
    </form>
  );
}
