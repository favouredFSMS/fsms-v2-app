"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { uploadFileAction, type UploadActionState } from "@/lib/actions/uploads";
import { Button } from "@/components/ui/button";
import { Field, FieldError } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";

const PURPOSES = ["lessons", "homework", "materials", "badges", "avatars", "general"] as const;

/**
 * FSMS V2 — file upload form (Phase 26, F20.1). Uploads to Supabase Storage
 * and registers metadata in the `uploads` table. Purpose + optional record id
 * shape the tenant-scoped storage path.
 */
export function FileUploadForm() {
  const t = useTranslations("materials");
  const [state, formAction, pending] = useActionState<UploadActionState | null, FormData>(
    uploadFileAction,
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
    <form ref={formRef} action={formAction} className="grid gap-3 sm:grid-cols-2">
      <Field label={t("uploadPurpose")} htmlFor="purpose">
        <Select id="purpose" name="purpose" defaultValue="materials">
          {PURPOSES.map((p) => (
            <option key={p} value={p}>
              {t(`purpose${p[0].toUpperCase()}${p.slice(1)}`)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t("uploadRecord")} htmlFor="recordId">
        <Input id="recordId" name="recordId" placeholder="e.g. lesson or material id" />
      </Field>
      <Field label={t("uploadChoose")} htmlFor="file">
        <Input id="file" name="file" type="file" required />
      </Field>
      <div className="flex items-end">
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? t("uploading") : t("uploadSubmit")}
        </Button>
      </div>
      {state && !state.ok && (
        <div className="sm:col-span-2">
          <FieldError>{state.message}</FieldError>
        </div>
      )}
      {state && state.ok && (
        <p className="sm:col-span-2 text-sm text-success-600">{state.message}</p>
      )}
    </form>
  );
}
