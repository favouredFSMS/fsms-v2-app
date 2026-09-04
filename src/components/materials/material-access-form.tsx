"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { saveMaterialAccessAction, type MaterialActionState } from "@/lib/actions/materials";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";

export function MaterialAccessForm({
  materialId,
  classes,
  current,
}: {
  materialId: string;
  classes: Array<{ id: string; name: string | null }>;
  current: string[];
}) {
  const [state, formAction, pending] = useActionState<MaterialActionState | null, FormData>(
    saveMaterialAccessAction,
    null,
  );
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      router.refresh();
    }
  }, [state?.ok, router]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="materialId" value={materialId} />
      <Field label="Classes with access" htmlFor={`access-${materialId}`}>
        <div className="flex max-h-40 flex-wrap gap-2 overflow-auto rounded-field border border-line bg-surface p-2">
          {classes.length === 0 && <span className="text-xs text-ink-faint">No classes yet.</span>}
          {classes.map((c) => (
            <label key={c.id} className="flex items-center gap-1.5 text-xs text-ink">
              <input
                type="checkbox"
                name="classIds"
                value={c.id}
                defaultChecked={current.includes(c.id)}
              />
              {c.name ?? c.id}
            </label>
          ))}
        </div>
      </Field>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save access"}
        </Button>
      </div>
    </form>
  );
}
