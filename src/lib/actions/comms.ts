"use server";

import { revalidatePath } from "next/cache";
import { requireDbContext } from "@/lib/db/context";
import { CommsRepository } from "@/lib/db/repos/comms";
import type { ServiceResult } from "@/lib/db/errors";

/**
 * FSMS V2 — messaging & notifications server actions (Phase 22).
 */

export type CommsActionState = { ok: boolean; message?: string };

function toState<T>(res: ServiceResult<T>): CommsActionState {
  if (res.ok) return { ok: true };
  return { ok: false, message: res.error.message };
}

function field(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

function uuidArray(formData: FormData, key: string): string[] {
  const all = formData.getAll(key);
  return all.filter((v): v is string => typeof v === "string" && v.length > 0);
}

export async function sendMessageAction(
  _prev: CommsActionState | null,
  formData: FormData,
): Promise<CommsActionState> {
  try {
    const ctx = await requireDbContext();
    const repo = new CommsRepository(ctx);
    const threadId = field(formData, "threadId");
    const body = field(formData, "body");
    const to = uuidArray(formData, "to");

    const res = threadId
      ? await repo.reply({ threadId, body: body ?? "" })
      : await repo.send({ to, subject: field(formData, "subject"), body: body ?? "" });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Message was not sent (denied)" };
    revalidatePath("/messaging");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to send message" };
  }
}

export async function markThreadReadAction(threadId: string): Promise<void> {
  if (!threadId) return;
  try {
    const ctx = await requireDbContext();
    await new CommsRepository(ctx).markThreadRead({ threadId });
  } catch {
    /* best-effort */
  }
}

export async function deleteMessageAction(
  _prev: CommsActionState | null,
  formData: FormData,
): Promise<CommsActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new CommsRepository(ctx).deleteMessage({ messageId: field(formData, "messageId") ?? "" });
    if (!res.ok) return toState(res);
    revalidatePath("/messaging");
    return { ok: true, message: res.data ? "Message deleted" : "Not deleted (not yours)" };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to delete message" };
  }
}

export async function markNotifReadAction(notifId: string): Promise<void> {
  if (!notifId) return;
  try {
    const ctx = await requireDbContext();
    await new CommsRepository(ctx).markNotifRead({ notifId });
  } catch {
    /* best-effort */
  }
}

export async function markAllNotifsReadAction(): Promise<void> {
  try {
    const ctx = await requireDbContext();
    await new CommsRepository(ctx).markAllNotifsRead();
  } catch {
    /* best-effort */
  }
}

export async function savePrefsAction(
  _prev: CommsActionState | null,
  formData: FormData,
): Promise<CommsActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new CommsRepository(ctx).savePrefs({
      emailEnabled: field(formData, "emailEnabled") === "on",
      inAppEnabled: field(formData, "inAppEnabled") === "on",
      kinds: null,
    });
    if (!res.ok) return toState(res);
    revalidatePath("/notifications");
    return { ok: true, message: "Preferences saved" };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to save preferences" };
  }
}
