"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { saveMaterialMappingAction, type MaterialActionState } from "@/lib/actions/materials";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";

export function MaterialMappingForm({
  units,
  targets,
}: {
  units: Array<{ id: string; label: string }>;
  targets: Array<{ id: string; label: string }>;
}) {
  const [t, commonT] = [useTranslations("materials"), useTranslations("common")];
  const [state, formAction, pending] = useActionState<MaterialActionState | null, FormData>(
    saveMaterialMappingAction,
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
        <Field label={t("unit")} htmlFor="materialUnitId" required>
          <Select id="materialUnitId" name="materialUnitId" required defaultValue="">
            <option value="" disabled>
              {t("selectUnit")}
            </option>
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("learningTarget")} htmlFor="targetId" required>
          <Select id="targetId" name="targetId" required defaultValue="">
            <option value="" disabled>
              {t("selectTarget")}
            </option>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={commonT("scope")} htmlFor="scope">
          <Input id="scope" name="scope" placeholder="reading" />
        </Field>
        <Field label={commonT("purpose")} htmlFor="purpose">
          <Input id="purpose" name="purpose" placeholder="practice" />
        </Field>
        <Field label={commonT("pagesFrom")} htmlFor="pageStart">
          <Input id="pageStart" name="pageStart" type="number" min={0} />
        </Field>
        <Field label={commonT("pagesTo")} htmlFor="pageEnd">
          <Input id="pageEnd" name="pageEnd" type="number" min={0} />
        </Field>
      </div>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? t("proposing") : t("proposeMapping")}
        </Button>
      </div>
    </form>
  );
}
