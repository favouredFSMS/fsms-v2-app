"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { submitHomeworkAction, type HomeworkActionState } from "@/lib/actions/homework";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function HomeworkSubmitForm({ homeworkId }: { homeworkId: string }) {
  const [state, formAction, pending] = useActionState<HomeworkActionState | null, FormData>(
    submitHomeworkAction,
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
    <form ref={formRef} action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="homeworkId" value={homeworkId} />
      <Input name="note" placeholder="Note (optional)" className="w-44" />
      <Button type="submit" loading={pending} size="sm">Submit</Button>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
    </form>
  );
}
