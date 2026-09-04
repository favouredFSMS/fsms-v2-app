"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { linkParentAction, type PeopleActionState } from "@/lib/actions/people";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";

export interface ParentOption {
  id: string;
  name: string | null;
}

export function LinkParentForm({
  studentId,
  parents,
}: {
  studentId: string;
  parents: ParentOption[];
}) {
  const [state, formAction, pending] = useActionState<PeopleActionState | null, FormData>(
    linkParentAction,
    null,
  );
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.ok, router]);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="studentId" value={studentId} />
      <Field label="Parent" htmlFor="parentId" className="min-w-48">
        <Select id="parentId" name="parentId" required defaultValue="">
          <option value="" disabled>Select a parent…</option>
          {parents.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
      </Field>
      <Field label="Relationship" htmlFor="relationship" className="min-w-40">
        <Input id="relationship" name="relationship" defaultValue="parent" placeholder="mother / father" />
      </Field>
      <Button type="submit" loading={pending}>Link</Button>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
    </form>
  );
}
