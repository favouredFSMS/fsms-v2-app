"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createParentAction, type PeopleActionState } from "@/lib/actions/people";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ParentCreateForm() {
  const [t, commonT] = [useTranslations("parents"), useTranslations("common")];
  const [state, formAction, pending] = useActionState<PeopleActionState | null, FormData>(
    createParentAction,
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
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={commonT("fullName")} htmlFor="name" required>
          <Input id="name" name="name" required placeholder="Parent name" />
        </Field>
        <Field label={commonT("phone")} htmlFor="phone">
          <Input id="phone" name="phone" placeholder="+7 …" />
        </Field>
        <Field label={commonT("email")} htmlFor="email">
          <Input id="email" name="email" type="email" placeholder="parent@example.org" />
        </Field>
      </div>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      {state?.ok && <p className="text-sm text-success-600">{t("parentCreated")}</p>}
      <Button type="submit" loading={pending} className="self-start">
        {t("addParent")}
      </Button>
    </form>
  );
}
