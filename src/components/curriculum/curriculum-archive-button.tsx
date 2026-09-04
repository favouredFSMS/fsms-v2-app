"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { archiveCurriculumAction, type CurriculumActionState } from "@/lib/actions/curriculum";
import { Button } from "@/components/ui/button";

export function CurriculumArchiveButton({ curriculumId }: { curriculumId: string }) {
  const t = useTranslations("common");
  const [state, formAction, pending] = useActionState<CurriculumActionState | null, FormData>(
    archiveCurriculumAction,
    null,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="curriculumId" value={curriculumId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "…" : t("archive")}
      </Button>
      {state && !state.ok && <span className="ml-2 text-xs text-danger-600">{state.message}</span>}
    </form>
  );
}
