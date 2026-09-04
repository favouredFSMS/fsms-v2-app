import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR, TableEmpty } from "@/components/ui/table";
import { CursorPager } from "@/components/ui/cursor-pager";
import { EmptyState } from "@/components/ui/states";
import {
  requireDbContext,
  HomeworkRepository,
  ClassRepository,
} from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { profileCan } from "@/lib/auth/authorize";
import { HomeworkAssignForm } from "@/components/homework/homework-assign-form";
import { HomeworkGradeForm } from "@/components/homework/homework-grade-form";
import { HomeworkSubmitForm } from "@/components/homework/homework-submit-form";

export const metadata = { title: "Homework — FSMS V2" };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function statusVariant(status: string): "success" | "warning" | "danger" | "info" | "neutral" | "brand" {
  switch (status) {
    case "graded": return "success";
    case "submitted": return "brand";
    case "overdue": return "warning";
    case "missing": return "danger";
    default: return "neutral";
  }
}

type StatusT = (key: string) => string;
function statusLabel(st: StatusT, value: string): string {
  const k = value.toLowerCase();
  const out = st(k);
  return out !== k ? out : value;
}

export default async function HomeworkPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; status?: string; cursor?: string }>;
}) {
  const [t, st, commonT] = await Promise.all([
    getTranslations("homework"),
    getTranslations("status"),
    getTranslations("common"),
  ]);
  const profile = await requireUser();
  const sp = await searchParams;
  const ctx = await requireDbContext();
  const homework = new HomeworkRepository(ctx);

  const canAssign = profileCan(profile, "saveHomework");
  const canGrade = profileCan(profile, "gradeHomework");
  const canSubmit = profileCan(profile, "submitHomework");

  if (!canAssign) {
    const list = await homework.list({ pageSize: 50, cursor: sp.cursor });
    const classes = await new ClassRepository(ctx).search({ pageSize: 100 });
    const classOptions = classes.ok ? classes.data.items : [];

    return (
      <PageShell title={t("title")} permission="homework">
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("myHomework")}</CardTitle>
              <CardDescription>{t("myHomeworkDesc")}</CardDescription>
            </CardHeader>
            <CardBody className="px-0">
              {list.ok ? (
                list.data.items.length === 0 ? (
                  <TableEmpty colSpan={5}>{t("noHomework")}</TableEmpty>
                ) : (
                  <>
                    <Table>
                      <THead>
                        <TR>
                          <TH>{commonT("date")}</TH>
                          <TH>{commonT("class")}</TH>
                          <TH>{commonT("title")}</TH>
                          <TH>{commonT("status")}</TH>
                          <TH className="text-right">{commonT("actions")}</TH>
                        </TR>
                      </THead>
                      <TBody>
                        {list.data.items.map((h) => (
                          <TR key={h.id}>
                            <TD>{h.date}</TD>
                            <TD>{h.class_name}</TD>
                            <TD>
                              <div className="font-medium">{h.title}</div>
                              <div className="text-xs text-ink-faint">
                                {h.student_name}{h.due_date ? ` · ${t("deadline")} ${h.due_date}` : ""}
                              </div>
                              {h.score && <div className="text-xs text-success-700">{t("grade")}: {h.score}</div>}
                              {h.feedback && <div className="text-xs text-ink-muted">{h.feedback}</div>}
                            </TD>
                            <TD><Badge variant={statusVariant(h.status)}>{statusLabel(st, h.status)}</Badge></TD>
                            <TD className="text-right">
                              {canSubmit && (h.status === "assigned" || h.status === "overdue") ? (
                                <div className="flex justify-end">
                                  <HomeworkSubmitForm homeworkId={h.id} />
                                </div>
                              ) : (
                                <span className="text-xs text-ink-faint">—</span>
                              )}
                            </TD>
                          </TR>
                        ))}
                      </TBody>
                    </Table>
                    <CursorPager
                      basePath="/homework"
                      total={list.data.total}
                      shown={list.data.items.length}
                      nextCursor={list.data.nextCursor}
                    />
                  </>
                )
              ) : (
                <p className="px-4 pb-3 text-sm text-danger-600">{list.error.code}: {list.error.message}</p>
              )}
            </CardBody>
          </Card>
          {classOptions.length === 0 && (
            <EmptyState icon="info" title={commonT("noneYet")} description={t("noSubmissions")} />
          )}
        </div>
      </PageShell>
    );
  }

  const classes = await new ClassRepository(ctx).search({ pageSize: 100 });
  const list = classes.ok ? classes.data.items : [];
  const selectedClassId = sp.class ?? list[0]?.id ?? null;
  const roster = selectedClassId
    ? await new ClassRepository(ctx).detail(selectedClassId)
    : null;

  const items = await homework.list({
    classId: selectedClassId ?? undefined,
    status: sp.status,
    pageSize: 30,
    cursor: sp.cursor,
  });

  return (
    <PageShell title={t("title")} permission="homework">
      <div className="grid gap-4">
        {canAssign && selectedClassId && roster?.ok && roster.data && (
          <Card>
            <CardHeader>
              <CardTitle>{t("assignHomework")}</CardTitle>
              <CardDescription>{t("assignHomeworkDesc")}</CardDescription>
            </CardHeader>
            <CardBody>
              <HomeworkAssignForm
                classId={selectedClassId}
                date={today()}
                students={roster.data.students.map((s) => ({ id: s.id, name: s.name }))}
              />
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("desc")}</CardDescription>
          </CardHeader>
          <CardBody className="px-0">
            <form method="get" className="flex flex-wrap items-center gap-2 px-4 pb-3">
              <select name="class" defaultValue={selectedClassId ?? ""} className="rounded-field border bg-surface px-3 py-2 text-sm text-ink">
                <option value="">{t("allClasses")}</option>
                {list.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select name="status" defaultValue={sp.status ?? ""} className="rounded-field border bg-surface px-3 py-2 text-sm text-ink">
                <option value="">{commonT("all")}</option>
                {["assigned", "submitted", "graded", "overdue", "missing"].map((s) => (
                  <option key={s} value={s}>{statusLabel(st, s)}</option>
                ))}
              </select>
              <button type="submit" className="rounded-field bg-brand-600 px-3 py-2 text-sm text-ink-inverse hover:bg-brand-700">
                {commonT("filter")}
              </button>
            </form>

            {items.ok ? (
              items.data.items.length === 0 ? (
                <TableEmpty colSpan={6}>{t("noHomework")}</TableEmpty>
              ) : (
                <>
                  <Table>
                    <THead>
                      <TR>
                        <TH>{commonT("date")}</TH>
                        <TH>{commonT("student")}</TH>
                        <TH>{commonT("title")}</TH>
                        <TH>{commonT("status")}</TH>
                        <TH>{t("submissions")}</TH>
                        <TH className="text-right">{t("grade")}</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {items.data.items.map((h) => (
                        <TR key={h.id}>
                          <TD>{h.date}</TD>
                          <TD className="font-medium">{h.student_name}</TD>
                          <TD>
                            <div>{h.title}</div>
                            {h.latest_note && <div className="text-xs text-ink-faint">“{h.latest_note}”</div>}
                          </TD>
                          <TD><Badge variant={statusVariant(h.status)}>{statusLabel(st, h.status)}</Badge></TD>
                          <TD className="tabular-nums">{h.submissions}</TD>
                          <TD className="text-right">
                            {canGrade ? (
                              <div className="flex justify-end">
                                <HomeworkGradeForm homeworkId={h.id} score={h.score} feedback={h.feedback} />
                              </div>
                            ) : (
                              <span className="text-xs text-ink-faint">{h.score ?? "—"}</span>
                            )}
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                  <CursorPager
                    basePath="/homework"
                    total={items.data.total}
                    shown={items.data.items.length}
                    nextCursor={items.data.nextCursor}
                  />
                </>
              )
            ) : (
              <p className="px-4 pb-3 text-sm text-danger-600">{items.error.code}: {items.error.message}</p>
            )}
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}
