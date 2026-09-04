import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR, TableEmpty } from "@/components/ui/table";
import { CursorPager } from "@/components/ui/cursor-pager";
import {
  requireDbContext,
  AssessmentRepository,
  StudentRepository,
} from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { profileCan } from "@/lib/auth/authorize";
import { AssessmentMarkForm } from "@/components/assessments/assessment-mark-form";
import { AssessmentTestForm } from "@/components/assessments/assessment-test-form";
import { AssessmentRecordForm } from "@/components/assessments/assessment-record-form";
import { AssessmentArchiveButton } from "@/components/assessments/assessment-archive-button";

export const metadata = { title: "Assessments — FSMS V2" };

function pct(score: number | string | null, max: number | string | null): string {
  const s = typeof score === "string" ? Number(score) : score;
  const m = typeof max === "string" ? Number(max) : max;
  if (s == null || m == null || m <= 0) return "—";
  return `${Math.round((s / m) * 100)}%`;
}

function statusLabel(st: (k: string) => string, value: string): string {
  const k = value.toLowerCase();
  const out = st(k);
  return out !== k ? out : value;
}

export default async function AssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ student?: string; cursor?: string }>;
}) {
  const [t, st, commonT] = await Promise.all([
    getTranslations("assessments"),
    getTranslations("status"),
    getTranslations("common"),
  ]);
  const profile = await requireUser();
  const sp = await searchParams;
  const ctx = await requireDbContext();
  const assessments = new AssessmentRepository(ctx);

  const canRecord = profileCan(profile, "saveAssessment");
  const canPerformance = profileCan(profile, "performance");

  const studentsRes = await new StudentRepository(ctx).search({ pageSize: 100 });
  const students = studentsRes.ok
    ? studentsRes.data.items.map((s) => ({ id: s.id, name: s.name }))
    : [];

  const [list, tests, performance] = await Promise.all([
    assessments.list({ studentId: sp.student ?? undefined, pageSize: 30, cursor: sp.cursor }),
    assessments.tests({}),
    canPerformance ? assessments.performance({}) : Promise.resolve(null),
  ]);

  return (
    <PageShell title={t("title")} permission="assessments">
      <div className="grid gap-4">
        {canRecord && (
          <Card>
            <CardHeader>
              <CardTitle>{t("recordAssessment")}</CardTitle>
              <CardDescription>{t("recordAssessmentDesc")}</CardDescription>
            </CardHeader>
            <CardBody>
              <AssessmentMarkForm students={students} />
            </CardBody>
          </Card>
        )}

        {canRecord && (
          <Card>
            <CardHeader>
              <CardTitle>{t("assessmentTests")}</CardTitle>
              <CardDescription>{t("assessmentTestsDesc")}</CardDescription>
            </CardHeader>
            <CardBody>
              <AssessmentTestForm students={students} />
            </CardBody>
            <CardBody className="px-0 pt-0">
              {tests.ok && tests.data.length > 0 ? (
                <>
                  <AssessmentRecordForm
                    tests={tests.data.map((tt) => ({
                      id: tt.id,
                      label: `${tt.title ?? t("test")} — ${tt.student_name ?? "?"} (${tt.task_count ?? 0} ${commonT("tasks")})`,
                      taskCount: tt.task_count,
                    }))}
                  />
                  <div className="px-4 pt-3">
                    <Table>
                      <THead>
                        <TR>
                          <TH>{commonT("title")}</TH>
                          <TH>{commonT("student")}</TH>
                          <TH>{commonT("tasks")}</TH>
                          <TH>{commonT("difficulty")}</TH>
                          <TH>{commonT("status")}</TH>
                          <TH className="text-right">{commonT("actions")}</TH>
                        </TR>
                      </THead>
                      <TBody>
                        {tests.data.map((tt) => (
                          <TR key={tt.id}>
                            <TD>{tt.title ?? "—"}</TD>
                            <TD>{tt.student_name ?? "—"}</TD>
                            <TD>{tt.task_count ?? 0}</TD>
                            <TD>{tt.difficulty ?? "—"}</TD>
                            <TD><Badge variant={tt.status === "published" ? "success" : "neutral"}>{statusLabel(st, tt.status)}</Badge></TD>
                            <TD className="text-right">
                              <AssessmentArchiveButton testId={tt.id} />
                            </TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                  </div>
                </>
              ) : (
                <TableEmpty colSpan={6}>{t("noAssessmentTests")}</TableEmpty>
              )}
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t("results")}</CardTitle>
            <CardDescription>{canRecord ? t("resultsStaffDesc") : t("resultsSelfDesc")}</CardDescription>
          </CardHeader>
          <CardBody className="px-0">
            {canRecord && (
              <form method="get" className="flex flex-wrap items-center gap-2 px-4 pb-3">
                <select name="student" defaultValue={sp.student ?? ""} className="rounded-field border bg-surface px-3 py-2 text-sm text-ink">
                  <option value="">{t("allStudents")}</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <button type="submit" className="rounded-field bg-brand-600 px-3 py-2 text-sm text-ink-inverse hover:bg-brand-700">
                  {commonT("filter")}
                </button>
              </form>
            )}

            {list.ok ? (
              list.data.items.length === 0 ? (
                <TableEmpty colSpan={6}>{t("noAssessmentResults")}</TableEmpty>
              ) : (
                <>
                  <Table>
                    <THead>
                      <TR>
                        <TH>{commonT("date")}</TH>
                        <TH>{commonT("student")}</TH>
                        <TH>{commonT("type")}</TH>
                        <TH>{commonT("title")}</TH>
                        <TH>{commonT("score")}</TH>
                        <TH>{commonT("note")}</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {list.data.items.map((a) => (
                        <TR key={a.id}>
                          <TD>{a.date}</TD>
                          <TD>{a.student_name ?? "—"}</TD>
                          <TD>{a.type ?? "—"}</TD>
                          <TD>{a.title ?? "—"}</TD>
                          <TD>
                            <span className="font-medium">{a.score ?? "—"}</span>
                            <span className="text-ink-faint"> / {a.max_score ?? "—"}</span>{" "}
                            <span className="text-xs text-ink-muted">({pct(a.score, a.max_score)})</span>
                          </TD>
                          <TD className="max-w-xs text-sm">{a.note ?? "—"}</TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                  <CursorPager
                    basePath="/assessments"
                    total={list.data.total}
                    shown={list.data.items.length}
                    nextCursor={list.data.nextCursor}
                    extraParams={sp.student ? { student: sp.student } : undefined}
                  />
                </>
              )
            ) : (
              <p className="px-4 pb-3 text-sm text-danger-600">{list.error.code}: {list.error.message}</p>
            )}
          </CardBody>
        </Card>

        {canPerformance && performance && performance.ok && performance.data && (
          <Card>
            <CardHeader>
              <CardTitle>{t("performance")}</CardTitle>
              <CardDescription>{t("performanceDesc")}</CardDescription>
            </CardHeader>
            <CardBody className="px-0">
              {performance.data.students.length === 0 ? (
                <TableEmpty colSpan={5}>{t("noPerformanceData")}</TableEmpty>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>{commonT("student")}</TH>
                      <TH>{t("results")}</TH>
                      <TH>{t("average")}</TH>
                      <TH>{t("best")}</TH>
                      <TH>{t("latest")}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {performance.data.students.map((s) => (
                      <TR key={s.student_id}>
                        <TD>{s.student_name ?? "—"}</TD>
                        <TD>{s.count}</TD>
                        <TD>{s.avg_pct != null ? `${s.avg_pct}%` : "—"}</TD>
                        <TD>{s.best_pct != null ? `${s.best_pct}%` : "—"}</TD>
                        <TD>{s.latest_date ?? "—"}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </PageShell>
  );
}
