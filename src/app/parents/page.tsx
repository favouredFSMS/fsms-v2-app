import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR, TableEmpty } from "@/components/ui/table";
import { CursorPager } from "@/components/ui/cursor-pager";
import { requireDbContext, ParentRepository } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { profileCan } from "@/lib/auth/authorize";
import { ParentCreateForm } from "@/components/people/parent-create-form";

export const metadata = { title: "Parents — FSMS V2" };

export default async function ParentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cursor?: string }>;
}) {
  const [t, commonT] = await Promise.all([getTranslations("parents"), getTranslations("common")]);
  const profile = await requireUser();
  const sp = await searchParams;
  const ctx = await requireDbContext();
  const res = await new ParentRepository(ctx).search({
    search: sp.q,
    pageSize: 20,
    cursor: sp.cursor,
  });
  const canCreate = profileCan(profile, "saveParent");

  return (
    <PageShell title={t("title")} permission="parents">
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
                <TableEmpty colSpan={4}>{t("noParents")}</TableEmpty>
              ) : (
                <>
                  <Table>
                    <THead>
                      <TR>
                        <TH>{commonT("name")}</TH>
                        <TH>{commonT("phone")}</TH>
                        <TH>{commonT("email")}</TH>
                        <TH className="text-right">{t("children")}</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {res.data.items.map((p) => (
                        <TR key={p.id}>
                          <TD className="font-medium">{p.name}</TD>
                          <TD>{p.phone ?? "—"}</TD>
                          <TD>{p.email ?? "—"}</TD>
                          <TD className="text-right tabular-nums">{p.children}</TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                  <CursorPager
                    basePath="/parents"
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
              <CardTitle>{t("addParent")}</CardTitle>
              <CardDescription>{t("addParentDesc")}</CardDescription>
            </CardHeader>
            <CardBody>
              <ParentCreateForm />
            </CardBody>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
