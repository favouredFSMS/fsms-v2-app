"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { authorCurriculumAction, type CurriculumActionState } from "@/lib/actions/curriculum";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";

export function CurriculumAuthorForm({
  programmes,
}: {
  programmes: Array<{ id: string; label: string }>;
}) {
  const [t, commonT] = [useTranslations("curriculum"), useTranslations("common")];
  const [state, formAction, pending] = useActionState<CurriculumActionState | null, FormData>(
    authorCurriculumAction,
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
        <Field label={t("existingProgramme")} htmlFor="programmeId" className="sm:col-span-2">
          <Select id="programmeId" name="programmeId" defaultValue="">
            <option value="">{t("createNewProgramme")}</option>
            {programmes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label={t("programmeName")} htmlFor="programmeName">
          <Input id="programmeName" name="programmeName" placeholder="Elementary English" />
        </Field>
        <Field label={t("programmeCode")} htmlFor="programmeCode">
          <Input id="programmeCode" name="programmeCode" placeholder="EE-1" />
        </Field>
        <Field label={t("programmeType")} htmlFor="programmeType">
          <Input id="programmeType" name="programmeType" placeholder="course" />
        </Field>
        <Field label={t("standardProgramme")} htmlFor="programmeStandard">
          <Select id="programmeStandard" name="programmeStandard" defaultValue="false">
            <option value="false">{commonT("no")}</option>
            <option value="true">{commonT("yes")}</option>
          </Select>
        </Field>

        <Field label={t("unitTitle")} htmlFor="unitTitle">
          <Input id="unitTitle" name="unitTitle" placeholder="Greetings & introductions" />
        </Field>
        <Field label={t("unitCode")} htmlFor="unitCode">
          <Input id="unitCode" name="unitCode" placeholder="U1" />
        </Field>
        <Field label={t("unitNumber")} htmlFor="unitNo">
          <Input id="unitNo" name="unitNo" type="number" min={1} />
        </Field>
        <Field label={t("lessonTitle")} htmlFor="lessonTitle">
          <Input id="lessonTitle" name="lessonTitle" placeholder="Saying hello" />
        </Field>
        <Field label={t("lessonCode")} htmlFor="lessonCode">
          <Input id="lessonCode" name="lessonCode" placeholder="L1" />
        </Field>
        <Field label={t("lessonNumber")} htmlFor="lessonNo">
          <Input id="lessonNo" name="lessonNo" type="number" min={1} />
        </Field>

        <Field label={t("objectiveCefr")} htmlFor="objectiveCefr">
          <Input id="objectiveCefr" name="objectiveCefr" placeholder="a2" />
        </Field>
        <Field label={t("objectiveCode")} htmlFor="objectiveCode">
          <Input id="objectiveCode" name="objectiveCode" placeholder="O1" />
        </Field>
        <Field label={t("objectiveText")} htmlFor="objectiveText" className="sm:col-span-2">
          <Textarea
            id="objectiveText"
            name="objectiveText"
            placeholder="Can greet people and introduce themselves using simple phrases."
          />
        </Field>
      </div>

      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? t("authoring") : t("authorSpineNode")}
        </Button>
      </div>
    </form>
  );
}
