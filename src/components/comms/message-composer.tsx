"use client";

import { useActionState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { sendMessageAction, type CommsActionState } from "@/lib/actions/comms";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import type { PickOption } from "@/components/reports/report-picker";

export function MessageComposer({ recipients }: { recipients: PickOption[] }) {
  const [state, formAction, pending] = useActionState<CommsActionState | null, FormData>(
    sendMessageAction,
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
        <Field label="To" htmlFor="to">
          <select
            id="to"
            name="to"
            multiple
            required
            className="h-28 w-full rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm"
          >
            {recipients.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex flex-col gap-3">
          <Field label="Subject" htmlFor="subject">
            <Input id="subject" name="subject" placeholder="Optional subject" />
          </Field>
          <Field label="Message" htmlFor="body" required>
            <Textarea id="body" name="body" rows={5} required placeholder="Write a message…" />
          </Field>
        </div>
      </div>
      {state && !state.ok && <FieldError>{state.message}</FieldError>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send message"}
        </Button>
      </div>
      <p className="text-xs text-ink-500">Hold Ctrl/Cmd to select multiple recipients.</p>
    </form>
  );
}
