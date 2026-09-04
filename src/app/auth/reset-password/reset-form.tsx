"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { resetPasswordAction } from "@/lib/auth/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ResetForm() {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState(resetPasswordAction, null);

  if (state?.ok) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-field bg-success-50 px-3 py-2.5 text-sm text-success-700">
          {t("passwordUpdated")}
        </div>
        <ButtonLink href="/login" className="w-full">
          {t("signIn")}
        </ButtonLink>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label={t("newPassword")} htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          placeholder={t("atLeast8")}
        />
      </Field>

      <Field label={t("confirmNewPassword")} htmlFor="confirm">
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          placeholder={t("repeatPassword")}
        />
      </Field>

      {state?.error && <FieldError>{state.error}</FieldError>}

      <Button type="submit" loading={pending} className="w-full">
        {pending ? t("saving") : t("setPassword")}
      </Button>
    </form>
  );
}
