"use server";

import { revalidatePath } from "next/cache";
import { requireDbContext } from "@/lib/db/context";
import { ReportingRepository } from "@/lib/db/repos/reporting";
import type { ServiceResult } from "@/lib/db/errors";

/**
 * FSMS V2 — reporting server actions (Phase 20).
 *
 * The heavy report RPCs themselves run inside PostgreSQL (SECURITY DEFINER
 * read models), so a request is never blocked on the app server. CSV export is
 * queued (`report_exports`) and produced by `report_export_process` (office
 * roles), keeping heavy generation fully asynchronous.
 */

export type ReportingActionState = { ok: boolean; message?: string };

function toState<T>(res: ServiceResult<T>): ReportingActionState {
  if (res.ok) return { ok: true };
  return { ok: false, message: res.error.message };
}

function field(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

/** Enqueue a CSV export job. `kind` selects the CSV builder. */
export async function requestExportAction(
  _prev: ReportingActionState | null,
  formData: FormData,
): Promise<ReportingActionState> {
  try {
    const kind = field(formData, "kind");
    if (!kind) return { ok: false, message: "Choose an export type" };
    const classId = field(formData, "classId");
    const userId = field(formData, "userId");
    const month = field(formData, "month");
    const params: Record<string, string> = {};
    if (classId) params.classId = classId;
    if (userId) params.userId = userId;
    if (month) params.month = month;

    const ctx = await requireDbContext();
    const res = await new ReportingRepository(ctx).requestExport({ kind, params });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Export was not queued (denied)" };
    revalidatePath("/reports");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to queue export" };
  }
}

/** Process queued exports into ready CSV payloads (office roles only). */
export async function processExportsAction(): Promise<ReportingActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new ReportingRepository(ctx).processExports();
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Not allowed to process exports" };
    revalidatePath("/reports");
    return { ok: true, message: `Processed ${res.data.processed} export job(s)` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to process exports" };
  }
}

export type ExportCsvResult =
  | { ok: true; filename: string; csv: string }
  | { ok: false; message: string };

/** Fetch a ready export payload for download (server action, called from the client). */
export async function getExportCsvAction(jobId: string): Promise<ExportCsvResult> {
  try {
    const ctx = await requireDbContext();
    const res = await new ReportingRepository(ctx).exportResult({ jobId });
    if (!res.ok) return { ok: false, message: res.error.message };
    const job = res.data;
    if (!job) return { ok: false, message: "Export not found or not allowed" };
    if (job.status !== "ready" || !job.payload) {
      return { ok: false, message: job.status === "failed" ? (job.error ?? "Export failed") : "Export not ready" };
    }
    const stamp = job.completed_at ? new Date(job.completed_at).toISOString().slice(0, 10) : "export";
    return { ok: true, filename: `${job.kind}-${stamp}.csv`, csv: job.payload };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to fetch export" };
  }
}
