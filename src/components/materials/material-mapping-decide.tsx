"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { decideMaterialMappingAction, type MaterialActionState } from "@/lib/actions/materials";
import { Button } from "@/components/ui/button";

export function MaterialMappingDecide({ mappingId }: { mappingId: string }) {
  const t = useTranslations("common");
  const [state, formAction, pending] = useActionState<MaterialActionState | null, FormData>(
    decideMaterialMappingAction,
    null,
  );

  return (
    <form action={formAction} className="flex items-center gap-1.5">
      <input type="hidden" name="mappingId" value={mappingId} />
      <input type="hidden" name="decision" value="verified" />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? "…" : t("verify")}
      </Button>
      {state && !state.ok && <span className="text-xs text-danger-600">{state.message}</span>}
    </form>
  );
}

export function MaterialMappingReject({ mappingId }: { mappingId: string }) {
  const t = useTranslations("common");
  const [state, formAction, pending] = useActionState<MaterialActionState | null, FormData>(
    decideMaterialMappingAction,
    null,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="mappingId" value={mappingId} />
      <input type="hidden" name="decision" value="rejected" />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "…" : t("reject")}
      </Button>
      {state && !state.ok && <span className="ml-2 text-xs text-danger-600">{state.message}</span>}
    </form>
  );
}
