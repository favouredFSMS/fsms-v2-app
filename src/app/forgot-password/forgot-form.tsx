"use client";

import { useActionState } from "react";
import { forgotPasswordAction } from "@/lib/auth/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function ForgotForm() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, null);

  if (state?.ok) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-field bg-success-50 px-3 py-2.5 text-sm text-success-700">
          If an account exists for that address, a recovery link has been sent.
          Check your inbox.
        </div>
        <ButtonLink href="/login" variant="secondary" className="w-full">
          Back to sign in
        </ButtonLink>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Email" htmlFor="email" hint="We never reveal whether an address is registered.">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@school.org"
        />
      </Field>

      {state?.error && <FieldError>{state.error}</FieldError>}

      <Button type="submit" loading={pending} className="w-full">
        {pending ? "Sending…" : "Send recovery link"}
      </Button>

      <div className="flex items-center justify-between">
        <a href="/login" className="text-sm text-brand-600 hover:text-brand-700">
          Back to sign in
        </a>
        <Badge variant="neutral">O1 · email recovery</Badge>
      </div>
    </form>
  );
}
