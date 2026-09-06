import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR, TableEmpty } from "@/components/ui/table";
import { CursorPager } from "@/components/ui/cursor-pager";
import { requireDbContext, StudentRepository } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { profileCan } from "@/lib/auth/authorize";
import { StudentCreateForm } from "@/components/people/student-create-form";

export const metadata = { title: "Students — FSMS" };

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cursor?: string }>;
}) {
  const [t, st, commonT] = await Promise.all([
    getTranslations("students"),
    getTranslations("status"),
    getTranslations("common"),
  ]);
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
    <PageShell title={t("title")} permission="students">
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("desc")}</CardDescription>
          </CardHeader>
          <CardBody className="px-0">
            <form method="get" className="flex items-center gap-2 px-4 pb-3">
              <input
                name="q"
                defaultValue={sp.q ?? ""}
                placeholder={t("searchPlaceholder")}
                className="w-full max-w-xs rounded-field border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:border-brand-500 focus-ring"
              />
              <button type="submit" className="rounded-field bg-brand-600 px-3 py-2 text-sm text-ink-inverse hover:bg-brand-700">
                {commonT("search")}
              </button>
            </form>

            {res.ok ? (
              res.data.items.length === 0 ? (
                <TableEmpty colSpan={4}>{t("noStudents")}</TableEmpty>
              ) : (
                <>
                  <Table>
                    <THead>
                      <TR>
                        <TH>{commonT("name")}</TH>
                        <TH>{t("studentNo")}</TH>
                        <TH>{commonT("level")}</TH>
                        <TH className="text-right">{commonT("status")}</TH>
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
                            <Badge variant={s.status === "active" ? "success" : "neutral"}>{s.status && st.has(s.status) ? st(s.status) : s.status}</Badge>
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
              <CardTitle>{t("addStudent")}</CardTitle>
              <CardDescription>{t("addStudentDesc")}</CardDescription>
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
