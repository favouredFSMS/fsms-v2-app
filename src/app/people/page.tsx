import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR, TableEmpty } from "@/components/ui/table";
import { CursorPager } from "@/components/ui/cursor-pager";
import { requireDbContext, UserRepository } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { UserAdminRow } from "@/components/people/user-admin-row";

export const metadata = { title: "People — FSMS V2" };

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cursor?: string }>;
}) {
  const [t, st, commonT] = await Promise.all([
    getTranslations("people"),
    getTranslations("status"),
    getTranslations("common"),
  ]);
  const profile = await requireUser();
  const sp = await searchParams;
  const ctx = await requireDbContext();
  const repo = new UserRepository(ctx);
  const [res, roles] = await Promise.all([
    repo.search({ search: sp.q, pageSize: 20, cursor: sp.cursor }),
    repo.listRoles(),
  ]);

  const roleOptions = roles.ok ? roles.data : [];

  return (
    <PageShell title={t("title")} permission="users">
      <Card>
        <CardHeader>
          <CardTitle>{t("accounts")}</CardTitle>
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
              <TableEmpty colSpan={4}>{t("noAccounts")}</TableEmpty>
            ) : (
              <>
                <Table>
                  <THead>
                    <TR>
                      <TH>{commonT("name")}</TH>
                      <TH>{commonT("role")}</TH>
                      <TH>{commonT("status")}</TH>
                      <TH className="text-right">{commonT("admin")}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {res.data.items.map((u) => (
                      <TR key={u.id}>
                        <TD>
                          <div className="font-medium">{u.name}</div>
                          <div className="text-xs text-ink-faint">{u.email}</div>
                        </TD>
                        <TD>
                          <Badge variant="brand">{u.role_label ?? u.role_base}</Badge>
                        </TD>
                        <TD>
                          <Badge variant={u.status === "active" ? "success" : u.status === "pending" ? "warning" : "danger"}>
                            {u.status && st.has(u.status) ? st(u.status) : u.status}
                          </Badge>
                        </TD>
                        <TD className="text-right">
                          <UserAdminRow
                            userId={u.id}
                            status={u.status ?? "active"}
                            roleKey={u.role_key}
                            roles={roleOptions}
                            isSelf={u.id === profile.id}
                          />
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
                <CursorPager
                  basePath="/people"
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
