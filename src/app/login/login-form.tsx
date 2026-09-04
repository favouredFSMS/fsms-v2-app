"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { loginAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label={t("email")} htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@school.org"
        />
      </Field>

      <Field label={t("password")} htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
        />
      </Field>

      {state?.error && <FieldError>{state.error}</FieldError>}

      <Button type="submit" loading={pending} className="w-full">
        {pending ? t("signingIn") : t("signIn")}
      </Button>

      <a
        href="/forgot-password"
        className="text-center text-sm text-brand-600 hover:text-brand-700"
      >
        {t("forgotPassword")}
      </a>
    </form>
  );
}
