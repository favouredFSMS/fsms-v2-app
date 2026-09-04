"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { decideLessonChangeAction, type LessonActionState } from "@/lib/actions/lessons";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";

export function LessonChangeDecideForm({ changeId }: { changeId: string }) {
  const t = useTranslations("lessons");
  const [state, formAction, pending] = useActionState<LessonActionState | null, FormData>(
    decideLessonChangeAction,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <input type="hidden" name="changeId" value={changeId} />
      <div className="flex gap-2">
        <Button type="submit" name="decision" value="approved" disabled={pending}>
          {t("approve")}
        </Button>
        <Button type="submit" name="decision" value="declined" variant="secondary" disabled={pending}>
          {t("decline")}
        </Button>
      </div>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
    </form>
  );
}
