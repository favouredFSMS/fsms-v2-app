"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
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
  const [t, commonT] = [useTranslations("curriculum"), useTranslations("common")];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {deleted ? (
        <>
          {canRestore && <Inline action={restoreCurriculumAction} curriculumId={curriculumId} label={commonT("restore")} />}
          {canPermDelete && (
            <Inline
              action={permanentlyDeleteCurriculumAction}
              curriculumId={curriculumId}
              label={t("deleteForever")}
              variant="danger"
              confirm={t("confirmPermDelete")}
            />
          )}
        </>
      ) : (
        <>
          {status === "draft" && canReview && (
            <Inline action={submitCurriculumReviewAction} curriculumId={curriculumId} label={t("submitReview")} variant="secondary" />
          )}
          {status === "published" && canUnpublish && (
            <Inline action={unpublishCurriculumAction} curriculumId={curriculumId} label={commonT("unpublish")} />
          )}
          {canDuplicate && (
            <Inline action={duplicateCurriculumAction} curriculumId={curriculumId} label={commonT("duplicate")} />
          )}
          {canDelete && (
            <Inline
              action={deleteCurriculumAction}
              curriculumId={curriculumId}
              label={commonT("delete")}
              confirm={t("confirmSoftDelete")}
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
