"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { saveMaterialFeedbackAction, type MaterialActionState } from "@/lib/actions/materials";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";

export function MaterialFeedbackForm({ materialId }: { materialId: string }) {
  const [t, commonT] = [useTranslations("materials"), useTranslations("common")];
  const [state, formAction, pending] = useActionState<MaterialActionState | null, FormData>(
    saveMaterialFeedbackAction,
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
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="materialId" value={materialId} />
      <Field label={commonT("rating")} htmlFor="rating">
        <Select id="rating" name="rating" defaultValue="5">
          <option value="5">{t("veryUseful")}</option>
          <option value="4">4</option>
          <option value="3">3</option>
          <option value="2">2</option>
          <option value="1">{t("notSuitable")}</option>
        </Select>
      </Field>
      <Field label={commonT("note")} htmlFor="note" className="min-w-[14rem] flex-1">
        <Input id="note" name="note" placeholder={t("optionalNote")} />
      </Field>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "…" : t("rate")}
      </Button>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
    </form>
  );
}
