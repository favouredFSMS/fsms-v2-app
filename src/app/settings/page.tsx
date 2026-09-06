import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR, TableEmptyRow } from "@/components/ui/table";
import { requireUser } from "@/lib/auth/guards";
import { profileCan } from "@/lib/auth/authorize";
import { requireDbContext, SettingsRepository } from "@/lib/db";
import { SettingsEditor, SettingsRemoveForm } from "@/components/settings/settings-editor";

export const metadata = { title: "Settings — FSMS" };

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Phase 31 UAT — school profile + key/value settings (read for all, edit for
 *  saveSetting roles: admin/manager/secretary). */
export default async function SettingsPage() {
  const [t, commonT] = await Promise.all([
    getTranslations("settings"),
    getTranslations("common"),
  ]);
  const profile = await requireUser();
  const ctx = await requireDbContext();
  const repo = new SettingsRepository(ctx);

  const canEdit = profileCan(profile, "saveSetting");
  const listRes = await repo.list();
  const list = listRes.ok ? listRes.data : { school: null, rows: [] };
  const school = list.school;

  return (
    <PageShell title={t("title")} permission="settings">
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("schoolProfile")}</CardTitle>
            <CardDescription>{t("schoolProfileDesc")}</CardDescription>
          </CardHeader>
          <CardBody>
            <Table>
              <TBody>
                <TR>
                  <TH>{t("schoolName")}</TH>
                  <TD>{school?.name ?? "—"}</TD>
                </TR>
                <TR>
                  <TH>{t("timezone")}</TH>
                  <TD>{school?.timezone ?? "—"}</TD>
                </TR>
                <TR>
                  <TH>{t("currency")}</TH>
                  <TD>{school?.currency ?? "—"}</TD>
                </TR>
                <TR>
                  <TH>{t("defaultLocale")}</TH>
                  <TD>{school?.locale ?? "—"}</TD>
                </TR>
              </TBody>
            </Table>
          </CardBody>
        </Card>

        {canEdit && (
          <Card>
            <CardHeader>
              <CardTitle>{t("addEdit")}</CardTitle>
              <CardDescription>{t("addEditDesc")}</CardDescription>
            </CardHeader>
            <CardBody>
              <SettingsEditor />
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t("configured")}</CardTitle>
            <CardDescription>{t("configuredDesc")}</CardDescription>
          </CardHeader>
          <CardBody className="px-0">
            <Table>
              <THead>
                <TR>
                  <TH>{t("key")}</TH>
                  <TH>{t("value")}</TH>
                  <TH>{commonT("updated")}</TH>
                  <TH>{t("updatedBy")}</TH>
                  {canEdit && <TH>{commonT("actions")}</TH>}
                </TR>
              </THead>
              <TBody>
                {list.rows.length === 0 ? (
                  <TableEmptyRow colSpan={canEdit ? 5 : 4}>{t("noSettings")}</TableEmptyRow>
                ) : (
                  list.rows.map((r) => (
                    <TR key={r.key}>
                      <TD className="font-medium">{r.key}</TD>
                      <TD className="break-all">{formatValue(r.value)}</TD>
                      <TD>{r.updated_at ? new Date(r.updated_at).toLocaleString() : "—"}</TD>
                      <TD>{r.updated_by_name ?? "—"}</TD>
                      {canEdit && (
                        <TD>
                          <SettingsRemoveForm settingKey={r.key} />
                        </TD>
                      )}
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
