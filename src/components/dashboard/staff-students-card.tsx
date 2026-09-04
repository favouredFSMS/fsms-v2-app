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
        <CardTitle>Students</CardTitle>
        <CardDescription>
          Live list via the Phase 10 data-access layer — one keyset-paginated
          <code className="mx-1 rounded bg-surface-sunken px-1 font-mono text-xs">fsms.student_search()</code>
          round trip, school + visibility scoped by RLS.
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
                  <Badge variant={s.status === "active" ? "success" : "neutral"}>{s.status}</Badge>
                </TD>
              </TR>
            ))}
            <TR>
              <TD colSpan={4} className="px-4 py-3 text-right text-xs text-ink-faint">
                showing {students.data.items.length} of {students.data.total} · next cursor:{" "}
                {students.data.nextCursor ? "yes" : "no (last page)"}
              </TD>
            </TR>
          </TBody>
        </Table>
        <p className="px-5 pb-2 text-right font-mono text-[10px] text-ink-faint">
          tenant {schoolId}
        </p>
      </CardBody>
    </Card>
  );
}
