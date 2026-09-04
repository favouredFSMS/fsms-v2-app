"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { archiveAssessmentTestAction, type AssessmentActionState } from "@/lib/actions/assessments";
import { Button } from "@/components/ui/button";

export function AssessmentArchiveButton({ testId }: { testId: string }) {
  const t = useTranslations("common");
  const [state, formAction, pending] = useActionState<AssessmentActionState | null, FormData>(
    archiveAssessmentTestAction,
    null,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="testId" value={testId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "…" : t("archive")}
      </Button>
      {state && !state.ok && <span className="ml-2 text-xs text-danger-600">{state.message}</span>}
    </form>
  );
}
