import { Repository } from "../repository";
import { parseOrFail } from "../validate";
import { fail, ok, type ServiceResult } from "../errors";
import {
  pricingSaveSchema,
  studentPricingSchema,
  saveDiscountSchema,
  removeDiscountSchema,
  discountHistorySchema,
  paymentsListSchema,
  paymentClientsSchema,
  requestPaymentSchema,
  requestEarlyPaymentSchema,
  paymentIdSchema,
  editPaymentSchema,
  submitProofSchema,
  setStudentCreditSchema,
  creditAuditSchema,
  walletSchema,
  saveWalletSchema,
  walletCheerSchema,
  salarySaveSchema,
  salaryDeleteSchema,
  salaryRequestSchema,
  setPayrollSchema,
  type PricingSaveInput,
  type SaveDiscountInput,
  type PaymentsListInput,
  type PaymentClientsInput,
  type RequestPaymentInput,
  type RequestEarlyPaymentInput,
  type EditPaymentInput,
  type SubmitProofInput,
  type SetStudentCreditInput,
  type WalletInput,
  type SaveWalletInput,
  type WalletCheerInput,
  type SalarySaveInput,
  type SalaryRequestInput,
  type SetPayrollInput,
} from "@/lib/schemas/finance";

/**
 * FSMS V2 — FinanceRepository (Phase 23).
 *
 * Payments / wallet / payroll / pricing / discounts / credits (V101 D12),
 * kept logically separate from educational repositories. Money operations are
 * gated by the permission catalog (money roles + secretary per action) and
 * re-checked inside each SECURITY DEFINER RPC; the ledger is append-only with
 * duplicate-once semantics (unique (school, payment)).
 */

// ── pricing & discounts ──────────────────────────────────────────────────────

export interface PricingRow {
  id: string;
  name: Record<string, string> | null;
  level_code: string | null;
  price: number;
  currency: string | null;
  active: boolean;
}

export interface StudentDiscount {
  id: string;
  name: string | null;
  percent: number | null;
  amount: number | null;
  reason: string | null;
  active: boolean;
}

export interface StudentPricing {
  student: { id: string; name: string | null; level_code: string | null } | null;
  pricing: { price: number; currency: string | null } | null;
  discounts: StudentDiscount[];
  balance: number;
  credit: number;
}

export interface DiscountRow {
  id: string;
  name: string | null;
  percent: number | null;
  amount: number | null;
  reason: string | null;
  active: boolean;
  created_at: string;
  removed_at: string | null;
}

// ── payments ─────────────────────────────────────────────────────────────────

export interface PaymentRow {
  id: string;
  student_id: string;
  student_name: string | null;
  amount: number;
  currency: string | null;
  pay_type: string | null;
  status: string;
  due_date: string | null;
  confirmed_at: string | null;
  created_at: string;
  proofs: number;
}

export interface PaymentClientRow {
  id: string;
  name: string | null;
  student_no: string | null;
  level_code: string | null;
  balance: number;
  credit: number;
  pending_count: number;
}

export interface PaymentResult {
  id: string;
  student_id?: string;
  amount: number;
  status?: string;
  due_date?: string | null;
  confirmed_at?: string | null;
  pay_type?: string | null;
}

export interface ProofRow {
  id: string;
  payment_id: string | null;
  file_path: string;
  submitted_by: string | null;
  submitted_at: string;
  status: string | null;
}

// ── credits ──────────────────────────────────────────────────────────────────

export interface CreditAudit {
  rows: Array<{ id: string; amount: number; note: string | null; created_by: string | null; created_at: string }>;
  balance: number;
}

// ── wallet ───────────────────────────────────────────────────────────────────

export interface WalletRow {
  id: string;
  user_id: string;
  user_name: string | null;
  month: string;
  class_id: string | null;
  amount: number;
  currency: string | null;
  kind: string | null;
  created_at: string;
}

export interface WalletResult {
  rows: WalletRow[];
  total: number;
}

export interface WalletAdminRow {
  id: string;
  name: string | null;
  total: number;
}

// ── payroll ──────────────────────────────────────────────────────────────────

export interface PayrollRow {
  id: string;
  name: string | null;
  role_base: string | null;
  salary: { id: string; amount: number; status: string } | null;
}

export interface SalaryResult {
  id: string;
  user_id: string;
  month: string;
  amount: number;
  status?: string;
}

export class FinanceRepository extends Repository {
  // ── pricing & discounts ────────────────────────────────────────────────────

  async pricingList(): Promise<ServiceResult<PricingRow[]>> {
    const denied = this.can("studentPricing");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<{ rows: PricingRow[] } | null>("pricing_list", {});
    if (error) return fail(error);
    return ok((data as { rows: PricingRow[] } | null)?.rows ?? []);
  }

  async savePricing(input: unknown): Promise<ServiceResult<PricingRow | null>> {
    const parsed = parseOrFail(pricingSaveSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("pricingModule");
    if (denied) return fail(denied);
    const f: PricingSaveInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<PricingRow | null>("pricing_save", {
      p_id: f.id ?? null,
      p_name: f.name ? JSON.stringify(f.name) : null,
      p_level_code: f.levelCode ?? null,
      p_price: f.price,
      p_currency: f.currency,
      p_active: f.active ?? true,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async studentPricing(input: unknown): Promise<ServiceResult<StudentPricing | null>> {
    const parsed = parseOrFail(studentPricingSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("studentPricing");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<StudentPricing | null>("student_pricing", {
      p_student: parsed.data.studentId,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async saveDiscount(input: unknown): Promise<ServiceResult<StudentDiscount | null>> {
    const parsed = parseOrFail(saveDiscountSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("saveDiscount");
    if (denied) return fail(denied);
    const f: SaveDiscountInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<StudentDiscount | null>("save_discount", {
      p_student: f.studentId,
      p_name: f.name ?? null,
      p_percent: f.percent ?? null,
      p_amount: f.amount ?? null,
      p_reason: f.reason ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async removeDiscount(input: unknown): Promise<ServiceResult<{ id: string; active: boolean; removed_at: string } | null>> {
    const parsed = parseOrFail(removeDiscountSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("removeDiscount");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<{ id: string; active: boolean; removed_at: string } | null>(
      "remove_discount",
      { p_discount: parsed.data.discountId },
    );
    if (error) return fail(error);
    return ok(data);
  }

  async discountHistory(input: unknown): Promise<ServiceResult<DiscountRow[]>> {
    const parsed = parseOrFail(discountHistorySchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("discountHistory");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<{ rows: DiscountRow[] } | null>("discount_history", {
      p_student: parsed.data.studentId,
    });
    if (error) return fail(error);
    return ok((data as { rows: DiscountRow[] } | null)?.rows ?? []);
  }

  // ── payments ───────────────────────────────────────────────────────────────

  async payments(input: unknown): Promise<ServiceResult<PaymentRow[]>> {
    const parsed = parseOrFail(paymentsListSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("payments");
    if (denied) return fail(denied);
    const f: PaymentsListInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<{ rows: PaymentRow[] } | null>("payments_list", {
      p_student: f.studentId ?? null,
      p_status: f.status ?? null,
      p_page_size: f.pageSize,
      p_cursor: f.cursor ?? null,
    });
    if (error) return fail(error);
    return ok((data as { rows: PaymentRow[] } | null)?.rows ?? []);
  }

  async paymentClients(input: unknown): Promise<ServiceResult<PaymentClientRow[]>> {
    const parsed = parseOrFail(paymentClientsSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("paymentClients");
    if (denied) return fail(denied);
    const f: PaymentClientsInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<{ rows: PaymentClientRow[] } | null>("payment_clients", {
      p_search: f.search ?? null,
      p_page_size: f.pageSize,
    });
    if (error) return fail(error);
    return ok((data as { rows: PaymentClientRow[] } | null)?.rows ?? []);
  }

  async requestPayment(input: unknown): Promise<ServiceResult<PaymentResult | null>> {
    const parsed = parseOrFail(requestPaymentSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("requestPayment");
    if (denied) return fail(denied);
    const f: RequestPaymentInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<PaymentResult | null>("request_payment", {
      p_student: f.studentId,
      p_amount: f.amount,
      p_due_date: f.dueDate ?? null,
      p_pay_type: f.payType ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async requestEarlyPayment(input: unknown): Promise<ServiceResult<PaymentResult | null>> {
    const parsed = parseOrFail(requestEarlyPaymentSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("requestEarlyPayment");
    if (denied) return fail(denied);
    const f: RequestEarlyPaymentInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<PaymentResult | null>("request_early_payment", {
      p_student: f.studentId,
      p_class: f.classId,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async confirmPayment(input: unknown): Promise<ServiceResult<PaymentResult | null>> {
    const parsed = parseOrFail(paymentIdSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("confirmPayment");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<PaymentResult | null>("confirm_payment", {
      p_payment: parsed.data.paymentId,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async markPaid(input: unknown): Promise<ServiceResult<PaymentResult | null>> {
    const parsed = parseOrFail(paymentIdSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("markPaid");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<PaymentResult | null>("mark_paid", {
      p_payment: parsed.data.paymentId,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async cancelPayment(input: unknown): Promise<ServiceResult<PaymentResult | null>> {
    const parsed = parseOrFail(paymentIdSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("cancelPayment");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<PaymentResult | null>("cancel_payment", {
      p_payment: parsed.data.paymentId,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async revertPayment(input: unknown): Promise<ServiceResult<PaymentResult | null>> {
    const parsed = parseOrFail(paymentIdSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("revertPayment");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<PaymentResult | null>("revert_payment", {
      p_payment: parsed.data.paymentId,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async editPayment(input: unknown): Promise<ServiceResult<PaymentResult | null>> {
    const parsed = parseOrFail(editPaymentSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("editPayment");
    if (denied) return fail(denied);
    const f: EditPaymentInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<PaymentResult | null>("edit_payment", {
      p_payment: f.paymentId,
      p_amount: f.amount ?? null,
      p_due_date: f.dueDate ?? null,
      p_pay_type: f.payType ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async submitProof(input: unknown): Promise<ServiceResult<ProofRow | null>> {
    const parsed = parseOrFail(submitProofSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("submitProof");
    if (denied) return fail(denied);
    const f: SubmitProofInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<ProofRow | null>("submit_proof", {
      p_payment: f.paymentId,
      p_file_path: f.filePath,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async paymentProof(input: unknown): Promise<ServiceResult<ProofRow[]>> {
    const parsed = parseOrFail(paymentIdSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("paymentProof");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<{ rows: ProofRow[] } | null>("payment_proof", {
      p_payment: parsed.data.paymentId,
    });
    if (error) return fail(error);
    return ok((data as { rows: ProofRow[] } | null)?.rows ?? []);
  }

  // ── credits ────────────────────────────────────────────────────────────────

  async setStudentCredit(input: unknown): Promise<ServiceResult<{ id: string; amount: number; note: string | null } | null>> {
    const parsed = parseOrFail(setStudentCreditSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("setStudentCredit");
    if (denied) return fail(denied);
    const f: SetStudentCreditInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<{ id: string; amount: number; note: string | null } | null>(
      "set_student_credit",
      { p_student: f.studentId, p_amount: f.amount, p_note: f.note ?? null },
    );
    if (error) return fail(error);
    return ok(data);
  }

  async creditAudit(input: unknown): Promise<ServiceResult<CreditAudit | null>> {
    const parsed = parseOrFail(creditAuditSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("creditAudit");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<CreditAudit | null>("credit_audit", {
      p_student: parsed.data.studentId,
    });
    if (error) return fail(error);
    return ok(data);
  }

  // ── wallet ─────────────────────────────────────────────────────────────────

  async wallet(input: unknown): Promise<ServiceResult<WalletResult | null>> {
    const parsed = parseOrFail(walletSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("wallet");
    if (denied) return fail(denied);
    const f: WalletInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<WalletResult | null>("wallet", {
      p_user: f.userId ?? null,
      p_month: f.month ?? null,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async walletAdmin(input: { month?: string | null } = {}): Promise<ServiceResult<WalletAdminRow[]>> {
    const denied = this.can("walletAdmin");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<{ rows: WalletAdminRow[] } | null>("wallet_admin", {
      p_month: input.month ?? null,
    });
    if (error) return fail(error);
    return ok((data as { rows: WalletAdminRow[] } | null)?.rows ?? []);
  }

  async saveWallet(input: unknown): Promise<ServiceResult<{ id: string; user_id: string; month: string; amount: number } | null>> {
    const parsed = parseOrFail(saveWalletSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("saveWallet");
    if (denied) return fail(denied);
    const f: SaveWalletInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<{ id: string; user_id: string; month: string; amount: number } | null>(
      "save_wallet",
      { p_user: f.userId, p_month: f.month, p_amount: f.amount, p_kind: f.kind ?? "manual" },
    );
    if (error) return fail(error);
    return ok(data);
  }

  async walletCheer(input: unknown): Promise<ServiceResult<{ user_id: string; month: string } | null>> {
    const parsed = parseOrFail(walletCheerSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("walletCheer");
    if (denied) return fail(denied);
    const f: WalletCheerInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<{ user_id: string; month: string } | null>("wallet_cheer", {
      p_user: f.userId,
      p_month: f.month,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async dismissWalletCheer(month: string): Promise<ServiceResult<{ dismissed: number } | null>> {
    const denied = this.can("dismissWalletCheer");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<{ dismissed: number } | null>("dismiss_wallet_cheer", {
      p_month: month,
    });
    if (error) return fail(error);
    return ok(data);
  }

  // ── payroll ────────────────────────────────────────────────────────────────

  async payrollRoster(month?: string | null): Promise<ServiceResult<PayrollRow[]>> {
    const denied = this.can("payrollRoster");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<{ rows: PayrollRow[] } | null>("payroll_roster", {
      p_month: month ?? null,
    });
    if (error) return fail(error);
    return ok((data as { rows: PayrollRow[] } | null)?.rows ?? []);
  }

  async setPayroll(input: unknown): Promise<ServiceResult<{ updated: number } | null>> {
    const parsed = parseOrFail(setPayrollSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("setPayroll");
    if (denied) return fail(denied);
    const f: SetPayrollInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<{ updated: number } | null>("set_payroll", {
      p_month: f.month,
      p_rows: JSON.stringify(f.rows.map((r) => ({ user_id: r.userId, amount: r.amount }))),
    });
    if (error) return fail(error);
    return ok(data);
  }

  async saveSalary(input: unknown): Promise<ServiceResult<SalaryResult | null>> {
    const parsed = parseOrFail(salarySaveSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("saveSalary");
    if (denied) return fail(denied);
    const f: SalarySaveInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<SalaryResult | null>("save_salary", {
      p_user: f.userId,
      p_month: f.month,
      p_amount: f.amount,
      p_currency: f.currency,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async deleteSalary(input: unknown): Promise<ServiceResult<{ id: string } | null>> {
    const parsed = parseOrFail(salaryDeleteSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("deleteSalary");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<{ id: string } | null>("delete_salary", {
      p_salary: parsed.data.salaryId,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async requestSalary(input: unknown): Promise<ServiceResult<SalaryResult | null>> {
    const parsed = parseOrFail(salaryRequestSchema, input);
    if (!parsed.ok) return parsed;
    const denied = this.can("requestSalary");
    if (denied) return fail(denied);
    const f: SalaryRequestInput = parsed.data;
    const { data, error } = await this.ctx.db.rpc<SalaryResult | null>("request_salary", {
      p_month: f.month,
      p_amount: f.amount,
    });
    if (error) return fail(error);
    return ok(data);
  }

  async salaryRequestState(input: { month: string }): Promise<ServiceResult<SalaryResult | null>> {
    const denied = this.can("salaryRequestState");
    if (denied) return fail(denied);
    const { data, error } = await this.ctx.db.rpc<SalaryResult | null>("salary_request_state", {
      p_month: input.month,
    });
    if (error) return fail(error);
    return ok(data);
  }
}
