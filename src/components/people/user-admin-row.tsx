"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateUserAction, type PeopleActionState } from "@/lib/actions/people";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";

export interface RoleOption {
  key: string;
  label: string;
}

const STATUSES = ["active", "pending", "deactivated", "blocked"];

/**
 * Per-user admin controls (office only): change status and/or role.
 * Rendered read-only for the signed-in user (no self-demotion/lock-out).
 */
export function UserAdminRow({
  userId,
  status,
  roleKey,
  roles,
  isSelf,
}: {
  userId: string;
  status: string;
  roleKey: string | null;
  roles: RoleOption[];
  isSelf: boolean;
}) {
  const [state, formAction, pending] = useActionState<PeopleActionState | null, FormData>(
    updateUserAction,
    null,
  );
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.ok, router]);

  if (isSelf) {
    return <span className="text-xs text-ink-faint">you</span>;
  }

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <Select name="status" defaultValue={status} className="w-32" aria-label="Status">
        {STATUSES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </Select>
      <Select name="roleKey" defaultValue={roleKey ?? ""} className="w-36" aria-label="Role">
        <option value="">— role —</option>
        {roles.map((r) => (
          <option key={r.key} value={r.key}>{r.label}</option>
        ))}
      </Select>
      <Button type="submit" variant="secondary" size="sm" loading={pending}>
        Save
      </Button>
      {state && !state.ok && (
        <span className="text-xs text-danger-600">{state.message}</span>
      )}
    </form>
  );
}
