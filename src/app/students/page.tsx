import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR, TableEmpty } from "@/components/ui/table";
import { CursorPager } from "@/components/ui/cursor-pager";
import { requireDbContext, StudentRepository } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { profileCan } from "@/lib/auth/authorize";
import { StudentCreateForm } from "@/components/people/student-create-form";

export const metadata = { title: "Students — FSMS V2" };

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cursor?: string }>;
}) {
  const profile = await requireUser();
  const sp = await searchParams;
  const ctx = await requireDbContext();
  const res = await new StudentRepository(ctx).search({
    search: sp.q,
    pageSize: 20,
    cursor: sp.cursor,
  });

  const canCreate = profileCan(profile, "saveStudent");

  return (
    <PageShell title="Students" permission="students">
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Students</CardTitle>
            <CardDescription>
              School-scoped, visibility-scoped listing (RLS) with server-side search + keyset pagination.
            </CardDescription>
          </CardHeader>
          <CardBody className="px-0">
            <form method="get" className="flex items-center gap-2 px-4 pb-3">
              <input
                name="q"
                defaultValue={sp.q ?? ""}
                placeholder="Search name / student no…"
                className="w-full max-w-xs rounded-field border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand-500 focus-ring"
              />
              <button type="submit" className="rounded-field bg-brand-600 px-3 py-2 text-sm text-ink-inverse hover:bg-brand-700">
                Search
              </button>
            </form>

            {res.ok ? (
              res.data.items.length === 0 ? (
                <TableEmpty colSpan={4}>No students found.</TableEmpty>
              ) : (
                <>
                  <Table>
                    <THead>
                      <TR>
                        <TH>Name</TH>
                        <TH>Student no</TH>
                        <TH>Level</TH>
                        <TH className="text-right">Status</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {res.data.items.map((s) => (
                        <TR key={s.id}>
                          <TD>
                            <Link href={`/students/${s.id}`} className="font-medium text-brand-700 hover:underline">
                              {s.name}
                            </Link>
                          </TD>
                          <TD className="font-mono text-xs text-ink-faint">{s.student_no}</TD>
                          <TD>{s.level_code?.toUpperCase()}</TD>
                          <TD className="text-right">
                            <Badge variant={s.status === "active" ? "success" : "neutral"}>{s.status}</Badge>
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                  <CursorPager
                    basePath="/students"
                    search={sp.q}
                    total={res.data.total}
                    shown={res.data.items.length}
                    nextCursor={res.data.nextCursor}
                  />
                </>
              )
            ) : (
              <p className="px-4 pb-3 text-sm text-danger-600">{res.error.code}: {res.error.message}</p>
            )}
          </CardBody>
        </Card>

        {canCreate && (
          <Card>
            <CardHeader>
              <CardTitle>Add student</CardTitle>
              <CardDescription>Created in your school; link a parent or enrol in a class afterwards.</CardDescription>
            </CardHeader>
            <CardBody>
              <StudentCreateForm />
            </CardBody>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
