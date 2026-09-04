import { getTranslations } from "next-intl/server";
import { requireDbContext, StudentRepository } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Table, TBody, TD, TR } from "@/components/ui/table";

/**
 * Staff-only students card (Phase 10 DAL demo kept on the dashboard).
 * One keyset-paginated `fsms.student_search()` round trip, RLS scoped.
 */
export async function StaffStudentsCard({ schoolId }: { schoolId: string }) {
  const [t, st] = await Promise.all([getTranslations("dashboard"), getTranslations("status")]);
  const ctx = await requireDbContext();
  const students = await new StudentRepository(ctx).search({ pageSize: 5 });

  if (!students.ok) {
    return (
      <Card>
        <CardBody>
          <p className="text-sm text-danger-600">
            {students.error.code}: {students.error.message}
          </p>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("students")}</CardTitle>
        <CardDescription>
          {t("staffStudentsDesc")}
          <code className="mx-1 rounded bg-surface-sunken px-1 font-mono text-xs">fsms.student_search()</code>
        </CardDescription>
      </CardHeader>
      <CardBody className="px-0">
        <Table>
          <TBody>
            {students.data.items.map((s) => (
              <TR key={s.id}>
                <TD className="font-medium">{s.name}</TD>
                <TD className="font-mono text-xs text-ink-faint">{s.student_no}</TD>
                <TD>{s.level_code?.toUpperCase()}</TD>
                <TD className="text-right">
                  <Badge variant={s.status === "active" ? "success" : "neutral"}>
                    {s.status && st.has(s.status) ? st(s.status) : s.status}
                  </Badge>
                </TD>
              </TR>
            ))}
            <TR>
              <TD colSpan={4} className="px-4 py-3 text-right text-xs text-ink-faint">
                {t("listFooter", {
                  shown: students.data.items.length,
                  total: students.data.total,
                  cursor: students.data.nextCursor ? t("listCursorYes") : t("listCursorNo"),
                })}
              </TD>
            </TR>
          </TBody>
        </Table>
        <p className="px-5 pb-2 text-right font-mono text-[10px] text-ink-faint">
          {t("tenantLabel")} {schoolId}
        </p>
      </CardBody>
    </Card>
  );
}
