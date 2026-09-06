import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR, TableEmpty } from "@/components/ui/table";
import { CursorPager } from "@/components/ui/cursor-pager";
import { requireDbContext, UserRepository } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";

export const metadata = { title: "Teachers — FSMS" };

export default async function TeachersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cursor?: string }>;
}) {
  const [t, st, commonT] = await Promise.all([
    getTranslations("teachers"),
    getTranslations("status"),
    getTranslations("common"),
  ]);
  await requireUser();
  const sp = await searchParams;
  const ctx = await requireDbContext();
  const res = await new UserRepository(ctx).search({
    search: sp.q,
    role: "teacher",
    pageSize: 20,
    cursor: sp.cursor,
  });

  return (
    <PageShell title={t("title")} permission="teachers">
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
              <TableEmpty colSpan={4}>{t("noTeachers")}</TableEmpty>
            ) : (
              <>
                <Table>
                  <THead>
                    <TR>
                      <TH>{commonT("name")}</TH>
                      <TH>{commonT("email")}</TH>
                      <TH>{commonT("phone")}</TH>
                      <TH className="text-right">{commonT("status")}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {res.data.items.map((t) => (
                      <TR key={t.id}>
                        <TD className="font-medium">{t.name}</TD>
                        <TD>{t.email}</TD>
                        <TD>{t.phone ?? "—"}</TD>
                        <TD className="text-right">
                          <Badge variant={t.status === "active" ? "success" : "neutral"}>{t.status && st.has(t.status) ? st(t.status) : t.status}</Badge>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
                <CursorPager
                  basePath="/teachers"
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
    </PageShell>
  );
}
