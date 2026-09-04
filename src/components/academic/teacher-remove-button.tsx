"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { removeTeacherAction, type AcademicActionState } from "@/lib/actions/academic";

export function TeacherRemoveButton({ classId, userId }: { classId: string; userId: string }) {
  const t = useTranslations("common");
  const [state, formAction, pending] = useActionState<AcademicActionState | null, FormData>(
    removeTeacherAction,
    null,
  );
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.ok, router]);

  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="userId" value={userId} />
      <button type="submit" disabled={pending} className="text-xs text-danger-600 hover:underline">
        {t("remove")}
      </button>
    </form>
  );
}
