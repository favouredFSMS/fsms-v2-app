"use client";

import { useActionState, useEffect, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { setEnrolmentStatusAction, type AcademicActionState } from "@/lib/actions/academic";
import { Select } from "@/components/ui/input";

const STATUSES = ["active", "inactive", "left", "completed", "transferred", "dropped"];

export function EnrolmentStatusForm({
  enrolmentId,
  status,
}: {
  enrolmentId: string;
  status: string | null;
}) {
  const st = useTranslations("status");
  const [state, formAction, pending] = useActionState<AcademicActionState | null, FormData>(
    setEnrolmentStatusAction,
    null,
  );
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.ok, router]);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="enrolmentId" value={enrolmentId} />
      <Select
        name="status"
        defaultValue={status ?? "active"}
        disabled={pending}
        className="w-auto min-w-28"
        onChange={(e: ChangeEvent<HTMLSelectElement>) => {
          e.target.form?.requestSubmit();
        }}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>{st.has(s) ? st(s) : s}</option>
        ))}
      </Select>
      {state && !state.ok && <span className="text-xs text-danger-600">{state.message}</span>}
    </form>
  );
}
