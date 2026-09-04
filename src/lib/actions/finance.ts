"use server";

import { revalidatePath } from "next/cache";
import { requireDbContext } from "@/lib/db/context";
import { FinanceRepository } from "@/lib/db/repos/finance";
import type { ServiceResult } from "@/lib/db/errors";

/**
 * FSMS V2 — finance server actions (Phase 23). Payments / wallet / payroll /
 * pricing / discounts / credits. Financial actions stay in their own module,
 * separate from educational actions (spec D12 separation).
 */

export type FinanceActionState = { ok: boolean; message?: string };

function toState<T>(res: ServiceResult<T>): FinanceActionState {
  if (res.ok) return { ok: true };
  return { ok: false, message: res.error.message };
}

function field(formData: FormData, key: string): string | null {
  const v = formData.get(key);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

function money(formData: FormData, key: string): number | null {
  const v = field(formData, key);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function refresh(finance = true) {
  if (finance) revalidatePath("/finance");
  revalidatePath("/payroll");
}

export async function savePricingAction(
  _prev: FinanceActionState | null,
  formData: FormData,
): Promise<FinanceActionState> {
  try {
    const ctx = await requireDbContext();
    const repo = new FinanceRepository(ctx);
    const name = field(formData, "name");
    const res = await repo.savePricing({
      id: field(formData, "id"),
      name: name ? { en: name } : null,
      levelCode: field(formData, "levelCode"),
      price: money(formData, "price") ?? 0,
      currency: field(formData, "currency") ?? "RUB",
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Pricing was not saved (denied)" };
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to save pricing" };
  }
}

export async function requestPaymentAction(
  _prev: FinanceActionState | null,
  formData: FormData,
): Promise<FinanceActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new FinanceRepository(ctx).requestPayment({
      studentId: field(formData, "studentId") ?? "",
      amount: money(formData, "amount") ?? 0,
      dueDate: field(formData, "dueDate"),
      payType: field(formData, "payType"),
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Payment was not requested (denied)" };
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to request payment" };
  }
}

export async function paymentAction(
  op: "confirm" | "cancel" | "revert" | "markPaid",
  paymentId: string,
): Promise<FinanceActionState> {
  try {
    const ctx = await requireDbContext();
    const repo = new FinanceRepository(ctx);
    const res =
      op === "confirm"
        ? await repo.confirmPayment({ paymentId })
        : op === "cancel"
          ? await repo.cancelPayment({ paymentId })
          : op === "revert"
            ? await repo.revertPayment({ paymentId })
            : await repo.markPaid({ paymentId });
    if (!res.ok) return toState(res);
    refresh();
    return { ok: true, message: `Payment ${op}` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Payment action failed" };
  }
}

export async function saveDiscountAction(
  _prev: FinanceActionState | null,
  formData: FormData,
): Promise<FinanceActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new FinanceRepository(ctx).saveDiscount({
      studentId: field(formData, "studentId") ?? "",
      name: field(formData, "name"),
      percent: money(formData, "percent"),
      amount: money(formData, "amount"),
      reason: field(formData, "reason"),
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Discount was not saved (denied)" };
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to save discount" };
  }
}

export async function setCreditAction(
  _prev: FinanceActionState | null,
  formData: FormData,
): Promise<FinanceActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new FinanceRepository(ctx).setStudentCredit({
      studentId: field(formData, "studentId") ?? "",
      amount: money(formData, "amount") ?? 0,
      note: field(formData, "note"),
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Credit was not applied (denied)" };
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to apply credit" };
  }
}

export async function saveSalaryAction(
  _prev: FinanceActionState | null,
  formData: FormData,
): Promise<FinanceActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new FinanceRepository(ctx).saveSalary({
      userId: field(formData, "userId") ?? "",
      month: field(formData, "month") ?? "",
      amount: money(formData, "amount") ?? 0,
      currency: field(formData, "currency") ?? "RUB",
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Salary was not saved (denied)" };
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to save salary" };
  }
}

export async function saveWalletAction(
  _prev: FinanceActionState | null,
  formData: FormData,
): Promise<FinanceActionState> {
  try {
    const ctx = await requireDbContext();
    const res = await new FinanceRepository(ctx).saveWallet({
      userId: field(formData, "userId") ?? "",
      month: field(formData, "month") ?? "",
      amount: money(formData, "amount") ?? 0,
      kind: field(formData, "kind"),
    });
    if (!res.ok) return toState(res);
    if (!res.data) return { ok: false, message: "Wallet entry was not saved (denied)" };
    refresh();
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Failed to save wallet entry" };
  }
}
