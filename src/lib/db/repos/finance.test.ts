import { describe, expect, it } from "vitest";
import { FinanceRepository } from "./finance";
import { fakeAdapter } from "../testing/fake-adapter";
import type { DbContext } from "../context";
import type { AuthProfile } from "@/lib/auth/types";

const profile = (over: Partial<AuthProfile> = {}): AuthProfile => ({
  id: "u1",
  school_id: "s1",
  email: null,
  name: null,
  role_id: null,
  role_base: "admin1",
  role_key: "admin1",
  role_label: "Owner",
  rank: 100,
  locale: "en",
  notify_lang: "en",
  status: "active",
  must_change_password: false,
  linked_ids: [],
  permissions: ["*"],
  ...over,
});

const teacher = (): AuthProfile =>
  profile({
    role_base: "teacher",
    role_key: "teacher",
    role_label: "Teacher",
    rank: 40,
    permissions: ["studentPricing", "payments", "wallet", "requestSalary", "salaryRequestState"],
  });

const ctx = (adapter: ReturnType<typeof fakeAdapter>, p = profile()): DbContext => ({ profile: p, db: adapter });

const STU = "00000000-0000-0000-0000-000000000401";

describe("FinanceRepository", () => {
  it("savePricing serialises the name object", async () => {
    let args: Record<string, unknown> | undefined;
    const adapter = fakeAdapter({
      async rpc<T>(_n: string, a?: Record<string, unknown>) {
        args = a;
        return { data: { id: "p1" } as T, error: null };
      },
    });
    const res = await new FinanceRepository(ctx(adapter)).savePricing({
      name: { en: "A2 Kids" },
      levelCode: "a2",
      price: 4500,
    });
    expect(res.ok).toBe(true);
    expect(args).toEqual({
      p_id: null,
      p_name: JSON.stringify({ en: "A2 Kids" }),
      p_level_code: "a2",
      p_price: 4500,
      p_currency: "RUB",
      p_active: true,
    });
  });

  it("requestPayment passes amount/due/pay_type", async () => {
    let args: Record<string, unknown> | undefined;
    const adapter = fakeAdapter({
      async rpc<T>(_n: string, a?: Record<string, unknown>) {
        args = a;
        return { data: null as T, error: null };
      },
    });
    await new FinanceRepository(ctx(adapter)).requestPayment({
      studentId: STU,
      amount: 900,
      dueDate: "2026-09-30",
      payType: "card",
    });
    expect(args).toEqual({ p_student: STU, p_amount: 900, p_due_date: "2026-09-30", p_pay_type: "card" });
  });

  it("setPayroll serialises rows", async () => {
    let args: Record<string, unknown> | undefined;
    const adapter = fakeAdapter({
      async rpc<T>(_n: string, a?: Record<string, unknown>) {
        args = a;
        return { data: { updated: 1 } as T, error: null };
      },
    });
    await new FinanceRepository(ctx(adapter)).setPayroll({
      month: "2026-09",
      rows: [{ userId: "00000000-0000-0000-0000-000000000202", amount: 50000 }],
    });
    expect(args).toEqual({
      p_month: "2026-09",
      p_rows: JSON.stringify([{ user_id: "00000000-0000-0000-0000-000000000202", amount: 50000 }]),
    });
  });

  it("teacher is denied saveDiscount (RBAC pre-check)", async () => {
    const res = await new FinanceRepository(ctx(fakeAdapter(), teacher())).saveDiscount({
      studentId: STU,
      percent: 5,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("forbidden");
  });

  it("teacher is denied paymentClients (RBAC pre-check)", async () => {
    const res = await new FinanceRepository(ctx(fakeAdapter(), teacher())).paymentClients({});
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("forbidden");
  });

  it("teacher can requestSalary (own)", async () => {
    let fn = "";
    const adapter = fakeAdapter({
      async rpc<T>(n: string) {
        fn = n;
        return { data: { id: "s1", amount: 65000 } as T, error: null };
      },
    });
    const res = await new FinanceRepository(ctx(adapter, teacher())).requestSalary({ month: "2026-10", amount: 65000 });
    expect(res.ok).toBe(true);
    expect(fn).toBe("request_salary");
  });
});
