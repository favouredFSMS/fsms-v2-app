import "server-only";

import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * FSMS V2 — Supabase Storage client (Phase 26, F20.1).
 *
 * Replaces V101's Google Drive as the primary file store. Uploads and deletes
 * go through the cookie-scoped Supabase client so storage policies apply to the
 * signed-in user. When Supabase is not configured (local dev harness) the
 * client returns null and callers degrade gracefully — uploads are registered
 * in the `uploads` table only if the bytes were actually stored.
 */

export interface StoredFile {
  path: string;
  bucket: string;
  sizeBytes: number;
  mime: string | null;
  originalName: string;
}

/**
 * A minimal storage interface, so callers never touch Supabase types directly
 * and the local-harness path can return null without leaking SDK internals.
 */
export interface StorageClient {
  /**
   * Upload a file. Returns the stored path, or null when storage is
   * unavailable (no Supabase configured) — the caller then skips the
   * `uploads` registry row.
   */
  upload(file: File, path: string): Promise<string | null>;
  /** Remove an object. No-op when storage is unavailable. */
  remove(path: string): Promise<void>;
  /** Create a signed URL for download (short TTL), or null. */
  signedUrl(path: string, ttlSeconds?: number): Promise<string | null>;
}

export function isStorageEnabled(): boolean {
  return !!env.supabaseUrl;
}

export async function getStorageClient(): Promise<StorageClient | null> {
  if (!isStorageEnabled()) return null;
  const supabase = await createSupabaseServerClient();
  const bucket = supabase.storage.from(env.storageBucket);

  return {
    async upload(file: File, path: string): Promise<string | null> {
      const { error } = await bucket.upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
      });
      if (error) throw new Error(`Storage upload failed: ${error.message}`);
      return path;
    },
    async remove(path: string): Promise<void> {
      await bucket.remove([path]);
    },
    async signedUrl(path: string, ttlSeconds = 60 * 60): Promise<string | null> {
      const { data, error } = await bucket.createSignedUrl(path, ttlSeconds);
      if (error || !data) return null;
      return data.signedUrl;
    },
  };
}
