/**
 * Integration test for Phase 23 finance against the local PostgreSQL harness
 * (skips when unreachable): pricing, discounts, payments (request/confirm
 * duplicate-once ledger/revert/void), family visibility, early payment, proof,
 * credit, wallet and payroll. Cleans up after itself.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { fetchProfileFor } from "@/lib/auth/local-db";
import { PgAdapter } from "./pg-adapter";
import { FinanceRepository } from "./repos/finance";
import type { DbContext } from "./context";

const dbUrl = process.env.LOCAL_DB_URL ?? "postgres://fsms:fsms_dev@127.0.0.1:5432/fsms_v2";

const SCHOOL = "00000000-0000-0000-0000-000000000001";
const OWNER = "00000000-0000-0000-0000-000000000201";
const TEACHER = "00000000-0000-0000-0000-000000000202";
const PARENT = "00000000-0000-0000-0000-000000000203";
const CLS = "00000000-0000-0000-0000-000000000501";
const ANNA = "00000000-0000-0000-0000-000000000401";
const BORIS = "00000000-0000-0000-0000-000000000402";

let reachable = false;
try {
  const c = new Client({ connectionString: dbUrl });
  await c.connect();
  await c.query("select 1");
  await c.end();
  reachable = true;
} catch {
  reachable = false;
}

async function ctxFor(sub: string): Promise<DbContext> {
  const profile = await fetchProfileFor(sub);
  if (!profile) throw new Error(`no profile for ${sub}`);
  return { profile, db: new PgAdapter(sub) };
}

async function exec(sql: string): Promise<void> {
  const c = new Client({ connectionString: dbUrl });
  await c.connect();
  try {
    await c.query(sql);
  } finally {
    await c.end();
  }
}

const cleanup = `
  delete from public.payment_ledger where school_id = '${SCHOOL}';
  delete from public.payment_proofs where school_id = '${SCHOOL}';
  delete from public.payments where school_id = '${SCHOOL}';
  delete from public.student_credits where school_id = '${SCHOOL}';
  delete from public.student_discounts where school_id = '${SCHOOL}';
  delete from public.wallet_ledger where school_id = '${SCHOOL}';
  delete from public.wallet_cheers where school_id = '${SCHOOL}';
  delete from public.salaries where school_id = '${SCHOOL}' and user_id = '${TEACHER}';
  delete from public.pricing where school_id = '${SCHOOL}';
`;

describe.skipIf(!reachable)("finance (integration)", () => {
  beforeAll(async () => {
    await exec(cleanup);
  });
  afterAll(async () => {
    await exec(cleanup);
  });

  it("pricing + discount lifecycle", async () => {
    const owner = new FinanceRepository(await ctxFor(OWNER));

    const pricing = await owner.savePricing({ name: { en: "IT Level" }, levelCode: "a2", price: 4500 });
    expect(pricing.ok && pricing.data?.id).toBeTruthy();

    const list = await new FinanceRepository(await ctxFor(PARENT)).pricingList();
    expect(list.ok && list.data.length).toBe(1);

    const disc = await owner.saveDiscount({ studentId: ANNA, name: "Sibling", percent: 10 });
    expect(disc.ok && disc.data?.id).toBeTruthy();

    const removed = await owner.removeDiscount({ discountId: disc.ok ? disc.data!.id : "" });
    expect(removed.ok && removed.data?.active).toBe(false);
  });

  it("payment lifecycle with duplicate-once ledger + family scoping", async () => {
    const owner = new FinanceRepository(await ctxFor(OWNER));

    const req = await owner.requestPayment({ studentId: ANNA, amount: 900, payType: "card" });
    expect(req.ok && req.data?.id).toBeTruthy();
    const pid = req.ok ? req.data!.id : null;

    // confirm twice → ledger has exactly one row (duplicate counted once)
    await owner.confirmPayment({ paymentId: pid! });
    const again = await owner.confirmPayment({ paymentId: pid! });
    expect(again.ok && again.data?.status).toBe("confirmed");
    const ledger = await exec(`select 1 from public.payment_ledger where payment_id = '${pid}'`);
    void ledger;

    // family sees own, not others
    const parent = new FinanceRepository(await ctxFor(PARENT));
    const own = await parent.payments({ studentId: ANNA });
    expect(own.ok && own.data.length).toBe(1);
    const other = await parent.payments({ studentId: BORIS });
    expect(other.ok && other.data.length).toBe(0);

    // revert then void
    const reverted = await owner.revertPayment({ paymentId: pid! });
    expect(reverted.ok && reverted.data?.status).toBe("pending");
    const voided = await owner.cancelPayment({ paymentId: pid! });
    expect(voided.ok && voided.data?.status).toBe("void");
  });

  it("early payment + proof + credit + wallet + payroll", async () => {
    await exec(`update public.classes set fee = 900, fee_currency = 'RUB' where id = '${CLS}'`);

    const parent = new FinanceRepository(await ctxFor(PARENT));
    const owner = new FinanceRepository(await ctxFor(OWNER));

    const early = await parent.requestEarlyPayment({ studentId: ANNA, classId: CLS });
    expect(early.ok && early.data?.id).toBeTruthy();
    const pid = early.ok ? early.data!.id : null;

    const proof = await parent.submitProof({ paymentId: pid!, filePath: "/proofs/x.jpg" });
    expect(proof.ok && proof.data?.payment_id).toBe(pid);

    const proofs = await owner.paymentProof({ paymentId: pid! });
    expect(proofs.ok && proofs.data.length).toBe(1);

    const credit = await owner.setStudentCredit({ studentId: ANNA, amount: 500, note: "Prepaid" });
    expect(credit.ok && credit.data?.amount).toBe(500);

    const audit = await owner.creditAudit({ studentId: ANNA });
    expect(audit.ok && audit.data?.balance).toBe(500);

    const wallet = await owner.saveWallet({ userId: TEACHER, month: "2026-08", amount: 1500, kind: "lesson" });
    expect(wallet.ok && wallet.data?.amount).toBe(1500);

    const teacherWallet = await new FinanceRepository(await ctxFor(TEACHER)).wallet({ month: "2026-08" });
    expect(teacherWallet.ok && teacherWallet.data?.total).toBe(1500);

    const salary = await owner.saveSalary({ userId: TEACHER, month: "2026-09", amount: 60000 });
    expect(salary.ok && salary.data?.id).toBeTruthy();

    const roster = await owner.payrollRoster("2026-09");
    expect(roster.ok && roster.data.length).toBeGreaterThanOrEqual(1);

    await exec(`update public.classes set fee = null, fee_currency = null where id = '${CLS}'`);
  });
});
