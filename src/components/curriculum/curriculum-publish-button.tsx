"use client";

import { useActionState } from "react";
import { publishCurriculumAction, type CurriculumActionState } from "@/lib/actions/curriculum";
import { Button } from "@/components/ui/button";

export function CurriculumPublishButton({ curriculumId }: { curriculumId: string }) {
  const [state, formAction, pending] = useActionState<CurriculumActionState | null, FormData>(
    publishCurriculumAction,
    null,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="curriculumId" value={curriculumId} />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "…" : "Publish"}
      </Button>
      {state && !state.ok && <span className="ml-2 text-xs text-danger-600">{state.message}</span>}
    </form>
  );
}
