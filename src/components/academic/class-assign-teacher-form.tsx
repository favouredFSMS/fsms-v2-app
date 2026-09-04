"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { assignTeacherAction, type AcademicActionState } from "@/lib/actions/academic";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Select } from "@/components/ui/input";
import type { Option } from "./class-create-form";

export function ClassAssignTeacherForm({
  classId,
  teachers,
}: {
  classId: string;
  teachers: Option[];
}) {
  const [state, formAction, pending] = useActionState<AcademicActionState | null, FormData>(
    assignTeacherAction,
    null,
  );
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.ok, router]);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="classId" value={classId} />
      <Field label="Teacher" htmlFor="userId" className="min-w-48">
        <Select id="userId" name="userId" required defaultValue="">
          <option value="" disabled>Select a teacher…</option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </Select>
      </Field>
      <label className="flex items-center gap-2 pb-2 text-sm text-ink-muted">
        <input type="checkbox" name="primary" className="accent-brand-600" />
        Primary teacher
      </label>
      <Button type="submit" loading={pending}>Assign</Button>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
    </form>
  );
}
