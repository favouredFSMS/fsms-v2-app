"use client";

import { useActionState } from "react";
import { deleteMethodologyAction, type MaterialActionState } from "@/lib/actions/materials";
import { Button } from "@/components/ui/button";

export function MethodologyDeleteButton({ methodologyId }: { methodologyId: string }) {
  const [state, formAction, pending] = useActionState<MaterialActionState | null, FormData>(
    deleteMethodologyAction,
    null,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="methodologyId" value={methodologyId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "…" : "Delete"}
      </Button>
      {state && !state.ok && <span className="ml-2 text-xs text-danger-600">{state.message}</span>}
    </form>
  );
}
