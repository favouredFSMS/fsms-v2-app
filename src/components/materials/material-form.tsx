"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { saveMaterialAction, type MaterialActionState } from "@/lib/actions/materials";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";

export function MaterialForm() {
  const [t, commonT] = [useTranslations("materials"), useTranslations("common")];
  const [state, formAction, pending] = useActionState<MaterialActionState | null, FormData>(
    saveMaterialAction,
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
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={commonT("title")} htmlFor="title" required>
          <Input id="title" name="title" required placeholder="Family and Friends 2" />
        </Field>
        <Field label={commonT("type")} htmlFor="type">
          <Select id="type" name="type" defaultValue="textbook">
            <option value="textbook">{t("textbook")}</option>
            <option value="workbook">{t("workbook")}</option>
            <option value="reader">{t("reader")}</option>
            <option value="media">{t("media")}</option>
            <option value="other">{t("other")}</option>
          </Select>
        </Field>
        <Field label={commonT("level")} htmlFor="levelCode">
          <Input id="levelCode" name="levelCode" placeholder="a2" />
        </Field>
        <Field label={t("publisher")} htmlFor="publisher">
          <Input id="publisher" name="publisher" placeholder="Oxford" />
        </Field>
        <Field label={commonT("isbn")} htmlFor="isbn">
          <Input id="isbn" name="isbn" placeholder="978-0-19-..." />
        </Field>
        <Field label={t("driveUrl")} htmlFor="driveUrl">
          <Input id="driveUrl" name="driveUrl" placeholder="https://drive.google.com/..." />
        </Field>
      </div>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? commonT("saving") : t("addMaterial")}
        </Button>
      </div>
    </form>
  );
}
