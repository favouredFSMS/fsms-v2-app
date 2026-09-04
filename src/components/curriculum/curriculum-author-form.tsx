"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { authorCurriculumAction, type CurriculumActionState } from "@/lib/actions/curriculum";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";

export function CurriculumAuthorForm({
  programmes,
}: {
  programmes: Array<{ id: string; label: string }>;
}) {
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
        <Field label="Existing programme (optional)" htmlFor="programmeId" className="sm:col-span-2">
          <Select id="programmeId" name="programmeId" defaultValue="">
            <option value="">Create a new programme…</option>
            {programmes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Programme name" htmlFor="programmeName">
          <Input id="programmeName" name="programmeName" placeholder="Elementary English" />
        </Field>
        <Field label="Programme code" htmlFor="programmeCode">
          <Input id="programmeCode" name="programmeCode" placeholder="EE-1" />
        </Field>
        <Field label="Programme type" htmlFor="programmeType">
          <Input id="programmeType" name="programmeType" placeholder="course" />
        </Field>
        <Field label="Standard programme" htmlFor="programmeStandard">
          <Select id="programmeStandard" name="programmeStandard" defaultValue="false">
            <option value="false">No</option>
            <option value="true">Yes</option>
          </Select>
        </Field>

        <Field label="Unit title" htmlFor="unitTitle">
          <Input id="unitTitle" name="unitTitle" placeholder="Greetings & introductions" />
        </Field>
        <Field label="Unit code" htmlFor="unitCode">
          <Input id="unitCode" name="unitCode" placeholder="U1" />
        </Field>
        <Field label="Unit number" htmlFor="unitNo">
          <Input id="unitNo" name="unitNo" type="number" min={1} />
        </Field>
        <Field label="Lesson title" htmlFor="lessonTitle">
          <Input id="lessonTitle" name="lessonTitle" placeholder="Saying hello" />
        </Field>
        <Field label="Lesson code" htmlFor="lessonCode">
          <Input id="lessonCode" name="lessonCode" placeholder="L1" />
        </Field>
        <Field label="Lesson number" htmlFor="lessonNo">
          <Input id="lessonNo" name="lessonNo" type="number" min={1} />
        </Field>

        <Field label="Objective (CEFR)" htmlFor="objectiveCefr">
          <Input id="objectiveCefr" name="objectiveCefr" placeholder="a2" />
        </Field>
        <Field label="Objective code" htmlFor="objectiveCode">
          <Input id="objectiveCode" name="objectiveCode" placeholder="O1" />
        </Field>
        <Field label="Objective text" htmlFor="objectiveText" className="sm:col-span-2">
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
          {pending ? "Authoring…" : "Author spine node"}
        </Button>
      </div>
    </form>
  );
}
