"use server";

import { revalidatePath } from "next/cache";
import { requireDbContext } from "@/lib/db/context";
import { MaterialRepository } from "@/lib/db/repos/materials";
import { getStorageClient, isStorageEnabled } from "@/lib/storage/client";
import { buildStoragePath, isSafeStoragePath } from "@/lib/storage/paths";
import { env } from "@/lib/env";
import { translate } from "@/i18n/server";

/**
 * FSMS V2 — file upload / delete server actions (Phase 26, F20.1).
 *
 * Replaces V101's Google Drive flow: bytes go to Supabase Storage, metadata is
 * registered in the `uploads` table (tenant-scoped RPC), and the object path is
 * tenant-first (`{school}/{purpose}/{record}/{file}`) so storage policies can
 * scope access per school. Deletes are soft-deletes of the registry row plus a
 * best-effort object removal.
 */

export type UploadActionState = { ok: boolean; message?: string };

/** Hard cap per file (20 MB) — matches the bucket policy expectation. */
const MAX_BYTES = 20 * 1024 * 1024;

export async function uploadFileAction(
  _prev: UploadActionState | null,
  formData: FormData,
): Promise<UploadActionState> {
  const ctx = await requireDbContext();
  const file = formData.get("file");
  const purpose = String(formData.get("purpose") ?? "general");
  const recordId = String(formData.get("recordId") ?? "general");

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, message: await translate("actions.uploadMissingFile") };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, message: await translate("actions.uploadTooLarge") };
  }
  if (!isStorageEnabled()) {
    return { ok: false, message: await translate("actions.storageNotConfigured") };
  }

  const path = buildStoragePath({
    schoolId: ctx.profile.school_id,
    purpose,
    id: recordId,
    filename: file.name,
  });

  const storage = await getStorageClient();
  let storedPath: string;
  try {
    storedPath = (await storage?.upload(file, path)) ?? "";
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : await translate("actions.uploadFailed"),
    };
  }
  if (!storedPath) {
    return { ok: false, message: await translate("actions.uploadFailed") };
  }

  const res = await new MaterialRepository(ctx).saveUpload({
    storagePath: storedPath,
    bucket: env.storageBucket,
    mime: file.type,
    sizeBytes: file.size,
    originalName: file.name,
  });
  if (!res.ok || !res.data) {
    // Registry write failed → remove the stored object so we leave no orphans.
    await storage?.remove(storedPath).catch(() => undefined);
    return { ok: false, message: await translate("actions.uploadFailed") };
  }

  revalidatePath("/materials");
  return { ok: true, message: await translate("actions.uploadSaved") };
}

export async function deleteUploadAction(
  uploadId: string,
  storagePath: string,
): Promise<UploadActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await ctx.db.rpc<boolean>("delete_upload", { p_upload: uploadId });
    if (res.error || !res.data) {
      return { ok: false, message: await translate("actions.uploadNotDeletedDenied") };
    }
    // Best-effort object removal (only paths shaped by us).
    if (isSafeStoragePath(storagePath) && isStorageEnabled()) {
      const storage = await getStorageClient();
      await storage?.remove(storagePath).catch(() => undefined);
    }
    revalidatePath("/materials");
    return { ok: true, message: await translate("actions.uploadDeleted") };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : await translate("actions.uploadDeleteFailed"),
    };
  }
}
