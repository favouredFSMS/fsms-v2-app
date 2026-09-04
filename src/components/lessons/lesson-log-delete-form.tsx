"use client";

import { useActionState } from "react";
import { deleteLessonLogAction, type LessonActionState } from "@/lib/actions/lessons";
import { Button } from "@/components/ui/button";

export function LessonLogDeleteForm({ logId }: { logId: string }) {
  const [state, formAction, pending] = useActionState<LessonActionState | null, FormData>(
    deleteLessonLogAction,
    null,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="logId" value={logId} />
      <Button type="submit" variant="danger" size="sm" disabled={pending}>
        {pending ? "…" : "Delete"}
      </Button>
      {state && !state.ok && <span className="ml-2 text-xs text-danger-600">{state.message}</span>}
    </form>
  );
}
