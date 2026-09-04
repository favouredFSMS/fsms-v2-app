"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { saveResourceAction, type MaterialActionState } from "@/lib/actions/materials";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ResourceForm() {
  const [t, commonT] = [useTranslations("materials"), useTranslations("common")];
  const [state, formAction, pending] = useActionState<MaterialActionState | null, FormData>(
    saveResourceAction,
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
        <Field label={commonT("title")} htmlFor="title" required>
          <Input id="title" name="title" required placeholder="Reading worksheet" />
        </Field>
        <Field label={commonT("url")} htmlFor="url">
          <Input id="url" name="url" placeholder="https://…" />
        </Field>
        <Field label={t("kind")} htmlFor="kind">
          <Input id="kind" name="kind" placeholder="worksheet" />
        </Field>
      </div>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? commonT("saving") : t("addResource")}
        </Button>
      </div>
    </form>
  );
}
