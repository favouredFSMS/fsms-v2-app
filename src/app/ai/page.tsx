import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR, TableEmpty } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { requireUser } from "@/lib/auth/guards";
import { profileCan } from "@/lib/auth/authorize";
import { requireDbContext, AiRepository, ClassRepository, StudentRepository } from "@/lib/db";
import { aiKeyring, aiBudget } from "@/lib/ai/config";
import { AskForm } from "@/components/ai/ask-form";
import { GenerateForm } from "@/components/ai/generate-form";
import { ProviderAdmin, type ProviderRow } from "@/components/ai/provider-admin";

export const metadata = { title: "AI — FSMS V2" };

const LEADERSHIP = ["admin1", "admin", "manager"];

export default async function AiPage() {
  const [t, commonT] = await Promise.all([
    getTranslations("ai"),
    getTranslations("common"),
  ]);
  const profile = await requireUser();
  const ctx = await requireDbContext();
  const ai = new AiRepository(ctx);

  const canAsk = profileCan(profile, "aiAsk");
  const canGenerate = profileCan(profile, "aiGenerate");
  const canConfig = profileCan(profile, "aiProviders");
  const canUsage = LEADERSHIP.includes(profile.role_base ?? "");
  const ring = aiKeyring();
  const budget = aiBudget();

  const [statusRes, providerRes, usageRes, classesRes, studentsRes] = await Promise.all([
    ai.status(),
    canConfig ? ai.providerList() : Promise.resolve(null),
    canUsage ? ai.usageList({ pageSize: 30 }) : Promise.resolve(null),
    canAsk ? new ClassRepository(ctx).search({ pageSize: 100 }) : Promise.resolve(null),
    canAsk ? new StudentRepository(ctx).search({ pageSize: 100 }) : Promise.resolve(null),
  ]);

  const status = statusRes.ok ? statusRes.data : null;
  const providers = providerRes && providerRes.ok ? providerRes.data : [];
  const usageRows = usageRes && usageRes.ok && usageRes.data ? usageRes.data.rows : [];

  const providerRows: ProviderRow[] = providers.map((p) => ({
    id: p.id,
    key_slug: p.key_slug,
    label: p.label,
    kind: p.kind,
    base_url: p.base_url,
    model: p.model,
    enabled: p.enabled,
    sort_order: p.sort_order,
    is_custom: p.is_custom,
    configured: Boolean(ring[p.key_slug]),
  }));

  const classes = (classesRes && classesRes.ok ? classesRes.data.items : []).map((c) => ({
    id: c.id,
    name: c.name ?? c.id,
  }));
  const students = (studentsRes && studentsRes.ok ? studentsRes.data.items : []).map((s) => ({
    id: s.id,
    name: s.name ?? s.student_no ?? s.id,
  }));

  const usageToday = status?.usage_today;

  return (
    <PageShell title={t("title")} permission="aiAsk">
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("assistant")}</CardTitle>
            <CardDescription>{t("assistantDesc")}</CardDescription>
          </CardHeader>
          <CardBody>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label={t("providersEnabled")} value={String(status?.providers.length ?? 0)} />
              <Stat label={t("keysConfigured")} value={`${providerRows.filter((p) => p.configured).length} / ${providerRows.length || status?.providers.length || 0}`} />
              <Stat label={t("callsToday")} value={String(usageToday?.calls ?? 0)} />
              <Stat label={t("costToday")} value={`$${Number(usageToday?.cost ?? 0).toFixed(4)}`} />
            </div>
            <p className="mt-2 text-xs text-ink-500">
              {t("budgetLine", {
                maxDailyCost: budget.maxDailyCost,
                maxTokensPerCall: budget.maxTokensPerCall,
                requestsPerMinute: budget.requestsPerMinute,
              })}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("ask")}</CardTitle>
            <CardDescription>{t("askDesc")}</CardDescription>
          </CardHeader>
          <CardBody>
            <AskForm students={students} classes={classes} />
          </CardBody>
        </Card>

        {canGenerate && (
          <Card>
            <CardHeader>
              <CardTitle>{t("generate")}</CardTitle>
              <CardDescription>{t("generateDesc")}</CardDescription>
            </CardHeader>
            <CardBody>
              <GenerateForm />
            </CardBody>
          </Card>
        )}

        {canConfig && (
          <Card>
            <CardHeader>
              <CardTitle>{t("providersOwner")}</CardTitle>
              <CardDescription>{t("providersOwnerDesc")}</CardDescription>
            </CardHeader>
            <CardBody>
              <ProviderAdmin providers={providerRows} />
            </CardBody>
          </Card>
        )}

        {canUsage && (
          <Card>
            <CardHeader>
              <CardTitle>{t("usageLog")}</CardTitle>
              <CardDescription>{t("usageLogDesc")}</CardDescription>
            </CardHeader>
            <CardBody className="px-0">
              <Table>
                <THead>
                  <TR>
                    <TH>{t("action")}</TH>
                    <TH>{t("user")}</TH>
                    <TH>{t("provider")}</TH>
                    <TH>{t("tokens")}</TH>
                    <TH>{commonT("cost")}</TH>
                    <TH>{commonT("status")}</TH>
                    <TH>{t("when")}</TH>
                  </TR>
                </THead>
                <TBody>
                  {usageRows.length === 0 ? (
                    <TableEmpty colSpan={7}>{t("noCalls")}</TableEmpty>
                  ) : (
                    usageRows.map((r) => (
                      <TR key={r.id}>
                        <TD>{r.action}</TD>
                        <TD>{r.user_name ?? "—"}</TD>
                        <TD>{r.provider ?? "—"}</TD>
                        <TD>{r.prompt_tokens + r.completion_tokens}</TD>
                        <TD>${Number(r.cost).toFixed(6)}</TD>
                        <TD>
                          <Badge variant={r.status === "ok" ? "success" : r.status === "fallback" ? "warning" : "danger"}>
                            {r.status}
                          </Badge>
                        </TD>
                        <TD>{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</TD>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-200 bg-ink-50 px-3 py-2">
      <div className="text-xs text-ink-500">{label}</div>
      <div className="text-lg font-semibold text-ink-900">{value}</div>
    </div>
  );
}
