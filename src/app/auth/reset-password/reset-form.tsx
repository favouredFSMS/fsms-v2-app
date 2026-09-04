"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "@/lib/auth/actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ResetForm() {
  const [state, formAction, pending] = useActionState(resetPasswordAction, null);

  if (state?.ok) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-field bg-success-50 px-3 py-2.5 text-sm text-success-700">
          Password updated. Sign in with your new password.
        </div>
        <ButtonLink href="/login" className="w-full">
          Sign in
        </ButtonLink>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="New password" htmlFor="password">
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          placeholder="At least 8 characters"
        />
      </Field>

      <Field label="Confirm new password" htmlFor="confirm">
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          placeholder="Repeat the password"
        />
      </Field>

      {state?.error && <FieldError>{state.error}</FieldError>}

      <Button type="submit" loading={pending} className="w-full">
        {pending ? "Saving…" : "Set password"}
      </Button>
    </form>
  );
}
