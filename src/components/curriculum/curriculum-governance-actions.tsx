"use client";

import { useActionState } from "react";
import {
  submitCurriculumReviewAction,
  unpublishCurriculumAction,
  duplicateCurriculumAction,
  deleteCurriculumAction,
  restoreCurriculumAction,
  permanentlyDeleteCurriculumAction,
  type CurriculumActionState,
} from "@/lib/actions/curriculum";
import { Button } from "@/components/ui/button";

function StateError({ state }: { state: CurriculumActionState | null }) {
  if (state && !state.ok) {
    return <span className="ml-2 text-xs text-danger-600">{state.message}</span>;
  }
  return null;
}

export function CurriculumGovernanceActions({
  curriculumId,
  status,
  deleted,
  canReview,
  canUnpublish,
  canDuplicate,
  canDelete,
  canRestore,
  canPermDelete,
}: {
  curriculumId: string;
  status: string;
  deleted: boolean;
  canReview: boolean;
  canUnpublish: boolean;
  canDuplicate: boolean;
  canDelete: boolean;
  canRestore: boolean;
  canPermDelete: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {deleted ? (
        <>
          {canRestore && <Inline action={restoreCurriculumAction} curriculumId={curriculumId} label="Restore" />}
          {canPermDelete && (
            <Inline
              action={permanentlyDeleteCurriculumAction}
              curriculumId={curriculumId}
              label="Delete forever"
              variant="danger"
              confirm="Permanently delete this curriculum and its versions?"
            />
          )}
        </>
      ) : (
        <>
          {status === "draft" && canReview && (
            <Inline action={submitCurriculumReviewAction} curriculumId={curriculumId} label="Submit" variant="secondary" />
          )}
          {status === "published" && canUnpublish && (
            <Inline action={unpublishCurriculumAction} curriculumId={curriculumId} label="Unpublish" />
          )}
          {canDuplicate && (
            <Inline action={duplicateCurriculumAction} curriculumId={curriculumId} label="Duplicate" />
          )}
          {canDelete && (
            <Inline
              action={deleteCurriculumAction}
              curriculumId={curriculumId}
              label="Delete"
              confirm="Delete (soft) this curriculum?"
            />
          )}
        </>
      )}
    </div>
  );
}

function Inline({
  action,
  curriculumId,
  label,
  variant = "ghost",
  confirm,
}: {
  action: (prev: CurriculumActionState | null, fd: FormData) => Promise<CurriculumActionState>;
  curriculumId: string;
  label: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  confirm?: string;
}) {
  const [state, formAction, pending] = useActionState<CurriculumActionState | null, FormData>(action, null);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      <input type="hidden" name="curriculumId" value={curriculumId} />
      <Button type="submit" variant={variant} size="sm" disabled={pending}>
        {pending ? "…" : label}
      </Button>
      <StateError state={state} />
    </form>
  );
}
