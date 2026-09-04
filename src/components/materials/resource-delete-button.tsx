"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { deleteResourceAction, type MaterialActionState } from "@/lib/actions/materials";
import { Button } from "@/components/ui/button";

export function ResourceDeleteButton({ resourceId }: { resourceId: string }) {
  const t = useTranslations("common");
  const [state, formAction, pending] = useActionState<MaterialActionState | null, FormData>(
    deleteResourceAction,
    null,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="resourceId" value={resourceId} />
      <Button type="submit" variant="ghost" size="sm" disabled={pending}>
        {pending ? "…" : t("remove")}
      </Button>
      {state && !state.ok && <span className="ml-2 text-xs text-danger-600">{state.message}</span>}
    </form>
  );
}
