"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { saveEvidenceAction, type CurriculumActionState } from "@/lib/actions/curriculum";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";

export function CurriculumEvidenceForm({
  students,
  targets,
  topics,
}: {
  students: Array<{ id: string; label: string }>;
  targets: Array<{ id: string; label: string }>;
  topics: Array<{ id: string; label: string }>;
}) {
  const [state, formAction, pending] = useActionState<CurriculumActionState | null, FormData>(
    saveEvidenceAction,
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
        <Field label="Student" htmlFor="studentId" required>
          <Select id="studentId" name="studentId" required defaultValue="">
            <option value="" disabled>
              Select student…
            </option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Learning target" htmlFor="targetId" required>
          <Select id="targetId" name="targetId" required defaultValue="">
            <option value="" disabled>
              Select target…
            </option>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Topic (optional)" htmlFor="topicId">
          <Select id="topicId" name="topicId" defaultValue="">
            <option value="">—</option>
            {topics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Quality" htmlFor="quality">
          <Select id="quality" name="quality" defaultValue="">
            <option value="">—</option>
            <option value="weak">Weak</option>
            <option value="ok">OK</option>
            <option value="strong">Strong</option>
          </Select>
        </Field>
        <Field label="Score" htmlFor="score">
          <Input id="score" name="score" type="number" step="any" min={0} placeholder="85" />
        </Field>
        <Field label="Rating" htmlFor="rating">
          <Input id="rating" name="rating" placeholder="5" />
        </Field>
        <Field label="Note" htmlFor="note" className="sm:col-span-2">
          <Textarea id="note" name="note" placeholder="What the learner demonstrated…" />
        </Field>
      </div>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Recording…" : "Record evidence"}
        </Button>
      </div>
    </form>
  );
}
