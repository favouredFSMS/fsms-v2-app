import { PageShell } from "@/components/layout/page-shell";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR, TableEmpty } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { requireDbContext, FinanceRepository } from "@/lib/db";

export const metadata = { title: "Payroll — FSMS V2" };

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await requireDbContext();
  const repo = new FinanceRepository(ctx);

  const month = sp.month ?? new Date().toISOString().slice(0, 7);

  const rosterRes = await repo.payrollRoster(month);
  const roster = rosterRes.ok ? rosterRes.data : [];

  return (
    <PageShell title="Payroll" permission="payrollRoster">
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Payroll roster</CardTitle>
            <CardDescription>
              Salaries for {month}. Use the salary-history report for a full ledger.
            </CardDescription>
          </CardHeader>
          <CardBody className="px-0">
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Role</TH>
                  <TH>Amount</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {roster.length === 0 ? (
                  <TableEmpty colSpan={4}>No staff on the roster.</TableEmpty>
                ) : (
                  roster.map((r) => (
                    <TR key={r.id}>
                      <TD>{r.name}</TD>
                      <TD>{r.role_base ?? "—"}</TD>
                      <TD>{r.salary ? r.salary.amount : "—"}</TD>
                      <TD>
                        {r.salary ? (
                          <Badge variant={r.salary.status === "paid" ? "success" : "neutral"}>
                            {r.salary.status}
                          </Badge>
                        ) : (
                          "—"
                        )}
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}
