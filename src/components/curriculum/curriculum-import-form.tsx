"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { importCurriculumAction, type CurriculumActionState } from "@/lib/actions/curriculum";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";

export function CurriculumImportForm({
  programmes,
}: {
  programmes: Array<{ id: string; label: string }>;
}) {
  const [t, commonT] = [useTranslations("curriculum"), useTranslations("common")];
  const [state, formAction, pending] = useActionState<CurriculumActionState | null, FormData>(
    importCurriculumAction,
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
        <Field label={t("programmeOptional")} htmlFor="programmeId" className="sm:col-span-2">
          <Select id="programmeId" name="programmeId" defaultValue="">
            <option value="">—</option>
            {programmes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={commonT("title")} htmlFor="title" required>
          <Input id="title" name="title" required placeholder="Elementary English — 2026 curriculum" />
        </Field>
        <Field label={t("publisher")} htmlFor="publisher">
          <Input id="publisher" name="publisher" placeholder="Head office" />
        </Field>
        <Field label={t("payloadJson")} htmlFor="payload" className="sm:col-span-2">
          <Textarea
            id="payload"
            name="payload"
            placeholder='{"units":[{"title":"Greetings","lessons":[{"title":"Hello"}]}]}'
          />
        </Field>
      </div>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? t("importing") : t("importDraft")}
        </Button>
      </div>
    </form>
  );
}
