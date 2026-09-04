"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { requestPaymentAction, type FinanceActionState } from "@/lib/actions/finance";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function RequestPaymentForm() {
  const [t, commonT] = [useTranslations("finance"), useTranslations("common")];
  const [state, formAction, pending] = useActionState<FinanceActionState | null, FormData>(
    requestPaymentAction,
    null,
  );
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state?.ok, router]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label={t("studentId")} htmlFor="studentId" required>
          <Input id="studentId" name="studentId" required placeholder="00000000-…" />
        </Field>
        <Field label={commonT("amount")} htmlFor="amount" required>
          <Input id="amount" name="amount" type="number" min={0} step="0.01" required placeholder="900" />
        </Field>
        <Field label={t("dueDate")} htmlFor="dueDate">
          <Input id="dueDate" name="dueDate" type="date" />
        </Field>
        <Field label={t("payType")} htmlFor="payType">
          <Input id="payType" name="payType" placeholder="card / cash / transfer" />
        </Field>
      </div>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? t("requesting") : t("requestPayment")}
        </Button>
      </div>
    </form>
  );
}
