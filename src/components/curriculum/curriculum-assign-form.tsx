"use client";

import { useActionState } from "react";
import { assignCurriculumAction, type CurriculumActionState } from "@/lib/actions/curriculum";
import { Button } from "@/components/ui/button";

export function CurriculumAssignForm({
  curriculumId,
  classes,
}: {
  curriculumId: string;
  classes: Array<{ id: string; name: string | null }>;
}) {
  const [state, formAction, pending] = useActionState<CurriculumActionState | null, FormData>(
    assignCurriculumAction,
    null,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="curriculumId" value={curriculumId} />
      <select
        name="classId"
        required
        defaultValue=""
        className="rounded-field border bg-surface px-2 py-1 text-xs text-ink"
      >
        <option value="" disabled>
          Assign to class…
        </option>
        {classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name ?? c.id}
          </option>
        ))}
      </select>
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "…" : "Assign"}
      </Button>
      {state && !state.ok && <span className="text-xs text-danger-600">{state.message}</span>}
    </form>
  );
}
