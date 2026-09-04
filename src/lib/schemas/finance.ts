import { z } from "zod";

/**
 * FSMS V2 — finance schemas (Phase 23): pricing, discounts, payments/ledger,
 * credits, wallet, payroll. Financial inputs are validated strictly (money is
 * never coerced silently).
 */

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const uuid = () => z.string().regex(UUID_RE, "Invalid id");
const optUuid = () => uuid().nullish();

const money = () => z.coerce.number().finite();
const optMoney = () =>
  z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().finite().optional());
const optDate = () => z.string().date("Invalid date (expected YYYY-MM-DD)").nullish();
const optMonth = () => z.string().trim().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Invalid month (YYYY-MM)").nullish();
const optText = (max = 500) => z.string().trim().max(max).nullish();

// ── pricing & discounts ──────────────────────────────────────────────────────

export const pricingSaveSchema = z.object({
  id: optUuid(),
  name: z.record(z.string(), z.string()).nullish(),
  levelCode: z.string().trim().max(20).nullish(),
  price: money(),
  currency: z.string().trim().max(8).default("RUB"),
  active: z.boolean().optional(),
});
export type PricingSaveInput = z.infer<typeof pricingSaveSchema>;

export const studentPricingSchema = z.object({ studentId: uuid() });
export type StudentPricingInput = z.infer<typeof studentPricingSchema>;

export const saveDiscountSchema = z.object({
  studentId: uuid(),
  name: optText(200),
  percent: optMoney(),
  amount: optMoney(),
  reason: optText(500),
});
export type SaveDiscountInput = z.infer<typeof saveDiscountSchema>;

export const removeDiscountSchema = z.object({ discountId: uuid() });
export type RemoveDiscountInput = z.infer<typeof removeDiscountSchema>;

export const discountHistorySchema = z.object({ studentId: uuid() });
export type DiscountHistoryInput = z.infer<typeof discountHistorySchema>;

// ── payments ─────────────────────────────────────────────────────────────────

export const paymentsListSchema = z.object({
  studentId: optUuid(),
  status: z.string().trim().max(30).nullish(),
  pageSize: z.number().int().min(1).max(100).default(50),
  cursor: z.string().max(500).nullish(),
});
export type PaymentsListInput = z.infer<typeof paymentsListSchema>;

export const paymentClientsSchema = z.object({
  search: optText(200),
  pageSize: z.number().int().min(1).max(100).default(50),
});
export type PaymentClientsInput = z.infer<typeof paymentClientsSchema>;

export const requestPaymentSchema = z.object({
  studentId: uuid(),
  amount: money(),
  dueDate: optDate(),
  payType: optText(50),
});
export type RequestPaymentInput = z.infer<typeof requestPaymentSchema>;

export const requestEarlyPaymentSchema = z.object({
  studentId: uuid(),
  classId: uuid(),
});
export type RequestEarlyPaymentInput = z.infer<typeof requestEarlyPaymentSchema>;

export const paymentIdSchema = z.object({ paymentId: uuid() });
export type PaymentIdInput = z.infer<typeof paymentIdSchema>;

export const editPaymentSchema = z.object({
  paymentId: uuid(),
  amount: optMoney(),
  dueDate: optDate(),
  payType: optText(50),
});
export type EditPaymentInput = z.infer<typeof editPaymentSchema>;

export const submitProofSchema = z.object({
  paymentId: uuid(),
  filePath: z.string().trim().min(1).max(2000),
});
export type SubmitProofInput = z.infer<typeof submitProofSchema>;

// ── credits ──────────────────────────────────────────────────────────────────

export const setStudentCreditSchema = z.object({
  studentId: uuid(),
  amount: money(),
  note: optText(500),
});
export type SetStudentCreditInput = z.infer<typeof setStudentCreditSchema>;

export const creditAuditSchema = z.object({ studentId: uuid() });
export type CreditAuditInput = z.infer<typeof creditAuditSchema>;

// ── wallet ───────────────────────────────────────────────────────────────────

export const walletSchema = z.object({
  userId: optUuid(),
  month: optMonth(),
});
export type WalletInput = z.infer<typeof walletSchema>;

export const saveWalletSchema = z.object({
  userId: uuid(),
  month: z.string().trim().regex(/^\d{4}-\d{2}$/),
  amount: money(),
  kind: optText(50),
});
export type SaveWalletInput = z.infer<typeof saveWalletSchema>;

export const walletCheerSchema = z.object({
  userId: uuid(),
  month: z.string().trim().regex(/^\d{4}-\d{2}$/),
});
export type WalletCheerInput = z.infer<typeof walletCheerSchema>;

// ── payroll ──────────────────────────────────────────────────────────────────

export const salarySaveSchema = z.object({
  userId: uuid(),
  month: z.string().trim().regex(/^\d{4}-\d{2}$/),
  amount: money(),
  currency: z.string().trim().max(8).default("RUB"),
});
export type SalarySaveInput = z.infer<typeof salarySaveSchema>;

export const salaryDeleteSchema = z.object({ salaryId: uuid() });
export type SalaryDeleteInput = z.infer<typeof salaryDeleteSchema>;

export const salaryRequestSchema = z.object({
  month: z.string().trim().regex(/^\d{4}-\d{2}$/),
  amount: money(),
});
export type SalaryRequestInput = z.infer<typeof salaryRequestSchema>;

export const setPayrollSchema = z.object({
  month: z.string().trim().regex(/^\d{4}-\d{2}$/),
  rows: z.array(z.object({ userId: uuid(), amount: money() })).max(500),
});
export type SetPayrollInput = z.infer<typeof setPayrollSchema>;
