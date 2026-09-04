import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR, TableEmpty } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/guards";
import { profileCan } from "@/lib/auth/authorize";
import { requireDbContext, FinanceRepository } from "@/lib/db";
import { PaymentActions } from "@/components/finance/payment-actions";
import { RequestPaymentForm } from "@/components/finance/request-payment-form";

export const metadata = { title: "Payments — FSMS V2" };

const MONEY = ["admin1", "admin", "manager", "accountant"];

function statusLabel(st: (k: string) => string, value: string): string {
  const k = value.toLowerCase();
  const out = st(k);
  return out !== k ? out : value;
}

export default async function FinancePage() {
  const [t, st, commonT] = await Promise.all([
    getTranslations("finance"),
    getTranslations("status"),
    getTranslations("common"),
  ]);
  const profile = await requireUser();
  const ctx = await requireDbContext();
  const repo = new FinanceRepository(ctx);

  const isMoney = MONEY.includes(profile.role_base ?? "");
  const canRequest = profileCan(profile, "requestPayment");
  const canPricing = profileCan(profile, "pricingModule");
  const canClients = profileCan(profile, "paymentClients");
  const canWallet = profileCan(profile, "walletAdmin");

  const [paymentsRes, clientsRes, pricingRes, walletRes] = await Promise.all([
    repo.payments({ pageSize: 50 }),
    canClients ? repo.paymentClients({}) : Promise.resolve(null),
    canPricing ? repo.pricingList() : Promise.resolve(null),
    canWallet ? repo.walletAdmin({}) : Promise.resolve(null),
  ]);

  const payments = paymentsRes.ok ? paymentsRes.data : [];
  const clients = clientsRes && clientsRes.ok ? clientsRes.data : [];
  const pricing = pricingRes && pricingRes.ok ? pricingRes.data : [];
  const wallet = walletRes && walletRes.ok ? walletRes.data : [];

  return (
    <PageShell title={t("title")} permission="payments">
      <div className="grid gap-4">
        {canClients && (
          <Card>
            <CardHeader>
              <CardTitle>{t("studentAccounts")}</CardTitle>
              <CardDescription>{t("studentAccountsDesc")}</CardDescription>
            </CardHeader>
            <CardBody className="px-0">
              <Table>
                <THead>
                  <TR>
                    <TH>{commonT("student")}</TH>
                    <TH>{commonT("level")}</TH>
                    <TH>{t("balance")}</TH>
                    <TH>{t("credit")}</TH>
                    <TH>{t("pending")}</TH>
                  </TR>
                </THead>
                <TBody>
                  {clients.length === 0 ? (
                    <TableEmpty colSpan={5}>{t("noStudents")}</TableEmpty>
                  ) : (
                    clients.map((c) => (
                      <TR key={c.id}>
                        <TD>{c.name}</TD>
                        <TD>{c.level_code ?? "—"}</TD>
                        <TD>{c.balance}</TD>
                        <TD>{c.credit}</TD>
                        <TD>{c.pending_count}</TD>
                      </TR>
                    ))
                  )}
                </TBody>
              </Table>
            </CardBody>
          </Card>
        )}

        {canRequest && (
          <Card>
            <CardHeader>
              <CardTitle>{t("requestPayment")}</CardTitle>
              <CardDescription>{t("requestPaymentDesc")}</CardDescription>
            </CardHeader>
            <CardBody>
              <RequestPaymentForm />
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t("payments")}</CardTitle>
            <CardDescription>{t("paymentsDesc")}</CardDescription>
          </CardHeader>
          <CardBody className="px-0">
            <Table>
              <THead>
                <TR>
                  <TH>{commonT("student")}</TH>
                  <TH>{commonT("amount")}</TH>
                  <TH>{commonT("type")}</TH>
                  <TH>{commonT("status")}</TH>
                  <TH>{t("due")}</TH>
                  <TH>{t("proofs")}</TH>
                  {isMoney && <TH>{commonT("actions")}</TH>}
                </TR>
              </THead>
              <TBody>
                {payments.length === 0 ? (
                  <TableEmpty colSpan={isMoney ? 7 : 6}>{t("noPayments")}</TableEmpty>
                ) : (
                  payments.map((p) => (
                    <TR key={p.id}>
                      <TD>{p.student_name}</TD>
                      <TD>
                        {p.amount} {p.currency ?? ""}
                      </TD>
                      <TD>{p.pay_type ?? "—"}</TD>
                      <TD>
                        <Badge variant={p.status === "confirmed" ? "success" : p.status === "void" ? "danger" : "neutral"}>
                          {statusLabel(st, p.status)}
                        </Badge>
                      </TD>
                      <TD>{p.due_date ?? "—"}</TD>
                      <TD>{p.proofs}</TD>
                      {isMoney && <TD><PaymentActions paymentId={p.id} status={p.status} /></TD>}
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </CardBody>
        </Card>

        {canPricing && (
          <Card>
            <CardHeader>
              <CardTitle>{t("pricing")}</CardTitle>
            </CardHeader>
            <CardBody className="px-0">
              <Table>
                <THead>
                  <TR>
                    <TH>{commonT("level")}</TH>
                    <TH>{t("price")}</TH>
                    <TH>{commonT("currency")}</TH>
                    <TH>{t("active")}</TH>
                  </TR>
                </THead>
                <TBody>
                  {pricing.length === 0 ? (
                    <TableEmpty colSpan={4}>{t("noPricing")}</TableEmpty>
                  ) : (
                    pricing.map((p) => (
                      <TR key={p.id}>
                        <TD>{p.level_code ?? "—"}</TD>
                        <TD>{p.price}</TD>
                        <TD>{p.currency ?? "—"}</TD>
                        <TD>
                          <Badge variant={p.active ? "success" : "neutral"}>{p.active ? t("active") : t("inactive")}</Badge>
                        </TD>
                      </TR>
                    ))
                  )}
                </TBody>
              </Table>
            </CardBody>
          </Card>
        )}

        {canWallet && (
          <Card>
            <CardHeader>
              <CardTitle>{t("teacherWallets")}</CardTitle>
            </CardHeader>
            <CardBody className="px-0">
              <Table>
                <THead>
                  <TR>
                    <TH>{commonT("teacher")}</TH>
                    <TH>{t("total")}</TH>
                  </TR>
                </THead>
                <TBody>
                  {wallet.length === 0 ? (
                    <TableEmpty colSpan={2}>{t("noTeachers")}</TableEmpty>
                  ) : (
                    wallet.map((w) => (
                      <TR key={w.id}>
                        <TD>{w.name}</TD>
                        <TD>{w.total}</TD>
                      </TR>
                    ))
                  )}
                </TBody>
              </Table>
            </CardBody>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
