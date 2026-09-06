"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { signupAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function SignupForm() {
  const t = useTranslations("auth");
  const [state, formAction, pending] = useActionState(signupAction, null);

  if (state?.ok) {
    return (
      <div className="flex flex-col gap-4 text-center">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <p className="font-semibold">{t("accountCreatedCheckEmail")}</p>
        </div>
        <a
          href="/login"
          className="inline-flex justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-brand-700"
        >
          {t("signIn")}
        </a>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3.5">
      <Field label={t("fullName")} htmlFor="name">
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          required
          placeholder="Jane Doe"
        />
      </Field>

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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={t("password")} htmlFor="password">
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="••••••••"
          />
        </Field>

        <Field label={t("confirmNewPassword")} htmlFor="confirm">
          <Input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            placeholder="••••••••"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={t("phone")} htmlFor="phone">
          <Input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+1 234 567 8900"
          />
        </Field>

        <Field label={t("iAmA")} htmlFor="role">
          <select
            id="role"
            name="role"
            defaultValue="parent"
            className="flex h-10 w-full rounded-field border border-line bg-surface px-3 py-2 text-sm text-ink shadow-xs focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-hidden transition"
          >
            <option value="parent">Parent</option>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={t("country")} htmlFor="country">
          <Input
            id="country"
            name="country"
            type="text"
            autoComplete="country-name"
            placeholder="United Kingdom"
          />
        </Field>

        <Field label={t("city")} htmlFor="city">
          <Input
            id="city"
            name="city"
            type="text"
            autoComplete="address-level2"
            placeholder="London"
          />
        </Field>
      </div>

      <Field label={t("signupNote")} htmlFor="note">
        <Input
          id="note"
          name="note"
          type="text"
          placeholder={t("signupNotePlaceholder")}
        />
      </Field>

      {state?.error && <FieldError>{state.error}</FieldError>}

      <Button type="submit" loading={pending} className="mt-2 w-full">
        {pending ? t("signingUp") : t("createAccount")}
      </Button>

      <a
        href="/login"
        className="mt-1 text-center text-sm font-medium text-brand-600 hover:text-brand-700"
      >
        {t("haveAccount")}
      </a>
    </form>
  );
}
