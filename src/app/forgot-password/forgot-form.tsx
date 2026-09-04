"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { forgotPasswordAction } from "@/lib/auth/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function ForgotForm() {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState(forgotPasswordAction, null);

  if (state?.ok) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-field bg-success-50 px-3 py-2.5 text-sm text-success-700">
          {t("recoverySent")}
        </div>
        <ButtonLink href="/login" variant="secondary" className="w-full">
          {t("backToSignIn")}
        </ButtonLink>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label={t("email")} htmlFor="email" hint={t("emailHint")}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@school.org"
        />
      </Field>

      {state?.error && <FieldError>{state.error}</FieldError>}

      <Button type="submit" loading={pending} className="w-full">
        {pending ? t("sending") : t("sendRecoveryLink")}
      </Button>

      <div className="flex items-center justify-between">
        <a href="/login" className="text-sm text-brand-600 hover:text-brand-700">
          {t("backToSignIn")}
        </a>
        <Badge variant="neutral">{t("o1Badge")}</Badge>
      </div>
    </form>
  );
}
