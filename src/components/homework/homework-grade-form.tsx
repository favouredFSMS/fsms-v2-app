"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { gradeHomeworkAction, type HomeworkActionState } from "@/lib/actions/homework";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";

export function HomeworkGradeForm({
  homeworkId,
  score,
  feedback,
}: {
  homeworkId: string;
  score: string | null;
  feedback: string | null;
}) {
  const [state, formAction, pending] = useActionState<HomeworkActionState | null, FormData>(
    gradeHomeworkAction,
    null,
  );
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.ok, router]);

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="homeworkId" value={homeworkId} />
      <Input name="score" defaultValue={score ?? ""} placeholder="Score" className="w-20" />
      <Input name="feedback" defaultValue={feedback ?? ""} placeholder="Feedback" className="w-40" />
      <Select name="status" defaultValue="graded" className="w-auto min-w-24">
        <option value="graded">graded</option>
        <option value="missing">missing</option>
        <option value="overdue">overdue</option>
        <option value="assigned">assigned</option>
      </Select>
      <Button type="submit" loading={pending} size="sm">Save</Button>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
    </form>
  );
}
