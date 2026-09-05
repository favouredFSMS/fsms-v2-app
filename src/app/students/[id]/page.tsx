import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TR, TableEmptyRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { requireDbContext, StudentRepository, ParentRepository } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { profileCan } from "@/lib/auth/authorize";
import { LinkParentForm } from "@/components/people/link-parent-form";

export const metadata = { title: "Student — FSMS V2" };

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [t, st, commonT, statesT] = await Promise.all([
    getTranslations("student"),
    getTranslations("status"),
    getTranslations("common"),
    getTranslations("states"),
  ]);
  const profile = await requireUser();
  const { id } = await params;
  const ctx = await requireDbContext();

  const detail = await new StudentRepository(ctx).detail(id);

  if (!detail.ok || !detail.data) {
    return (
      <PageShell title={t("title")} permission="students">
        <EmptyState
          icon="warning"
          title={statesT("notAvailable")}
          description={t("notAvailableDesc")}
        />
      </PageShell>
    );
  }

  const d = detail.data;
  const s = d.student;
  const canLinkParent = profileCan(profile, "saveParent");
  const parents = canLinkParent
    ? await new ParentRepository(ctx).search({ pageSize: 100 })
    : null;

  const stats: Array<[string, number]> = [
    [st("present"), d.summary.attendance_present],
    [st("late"), d.summary.attendance_late],
    [st("absent"), d.summary.attendance_absent],
    [t("homeworkStat"), d.summary.homework_total],
    [st("graded"), d.summary.homework_graded],
    [t("assessmentsStat"), d.summary.assessments],
    [t("evidenceStat"), d.summary.evidence],
  ];

  return (
    <PageShell title={s?.name ?? t("title")} permission="students">
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>
              {s?.name}
              <span className="ml-2 align-middle">
                <Badge variant={s?.status === "active" ? "success" : "neutral"}>{st.has(s?.status ?? "") ? st(s?.status ?? "") : s?.status}</Badge>
              </span>
            </CardTitle>
            <CardDescription>
              {s?.student_no} · {commonT("level")} {s?.level_code?.toUpperCase() ?? "—"} · {t("legacy")} {s?.legacy_id ?? "—"}
            </CardDescription>
          </CardHeader>
          <CardBody>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              <Row k={t("dateOfBirth")} v={s?.dob ?? "—"} />
              <Row k={t("gender")} v={s?.gender ?? "—"} />
              <Row k={t("learnerType")} v={s?.learner_type ?? "—"} />
              <Row k={t("joined")} v={s?.joined_at?.slice(0, 10) ?? "—"} />
              <Row k={commonT("phone")} v={s?.phone ?? "—"} />
              <Row k={commonT("email")} v={s?.email ?? "—"} />
              <Row k={t("address")} v={s?.address ?? "—"} />
              <Row k={commonT("notes")} v={s?.notes ?? "—"} />
            </dl>
          </CardBody>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>{commonT("classes")}</CardTitle>
              <CardDescription>{t("classesDesc")}</CardDescription>
            </CardHeader>
            <CardBody className="px-0">
              <Table>
                <TBody>
                  {d.classes.map((c) => (
                    <TR key={c.id}>
                      <TD className="font-medium">{c.name}</TD>
                      <TD>{c.level_code?.toUpperCase()}</TD>
                      <TD className="text-right text-xs text-ink-faint">{c.primary_teacher}</TD>
                    </TR>
                  ))}
                  {d.classes.length === 0 && <TableEmptyRow colSpan={3}>{t("notEnrolled")}</TableEmptyRow>}
                </TBody>
              </Table>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("parents")}</CardTitle>
              <CardDescription>{t("parentsDesc")}</CardDescription>
            </CardHeader>
            <CardBody className="px-0">
              <Table>
                <TBody>
                  {d.parents.map((p) => (
                    <TR key={p.id}>
                      <TD className="font-medium">{p.name}</TD>
                      <TD className="text-xs text-ink-faint">{p.relationship}</TD>
                      <TD className="text-right text-xs text-ink-faint">
                        {p.phone ?? p.email ?? ""}
                      </TD>
                    </TR>
                  ))}
                  {d.parents.length === 0 && <TableEmptyRow colSpan={3}>{t("noParentsLinked")}</TableEmptyRow>}
                </TBody>
              </Table>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("summary")}</CardTitle>
              <CardDescription>{t("summaryDesc")}</CardDescription>
            </CardHeader>
            <CardBody className="px-0">
              <Table>
                <TBody>
                  {stats.map(([k, v]) => (
                    <TR key={k}>
                      <TD>{k}</TD>
                      <TD className="text-right tabular-nums">{v}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </CardBody>
          </Card>
        </div>

        {canLinkParent && parents?.ok && (
          <Card>
            <CardHeader>
              <CardTitle>{t("linkParent")}</CardTitle>
              <CardDescription>{t("linkParentDesc")}</CardDescription>
            </CardHeader>
            <CardBody>
              <LinkParentForm
                studentId={id}
                parents={parents.data.items.map((p) => ({ id: p.id, name: p.name }))}
              />
            </CardBody>
          </Card>
        )}
      </div>
    </PageShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex min-w-0 gap-3 py-0.5">
      <dt className="w-36 shrink-0 text-sm text-ink-muted">{k}</dt>
      <dd className="min-w-0 break-words text-sm text-ink">{v}</dd>
    </div>
  );
}
