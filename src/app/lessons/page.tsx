import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR, TableEmpty } from "@/components/ui/table";
import { CursorPager } from "@/components/ui/cursor-pager";
import { requireDbContext, LessonRepository, ClassRepository, localized } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { profileCan } from "@/lib/auth/authorize";
import { LessonLogForm } from "@/components/lessons/lesson-log-form";
import { LessonLogDeleteForm } from "@/components/lessons/lesson-log-delete-form";
import { LessonPlanForm } from "@/components/lessons/lesson-plan-form";
import { LessonChangeRequestForm } from "@/components/lessons/lesson-change-request-form";
import { LessonChangeDecideForm } from "@/components/lessons/lesson-change-decide-form";
import { LessonControlForm } from "@/components/lessons/lesson-control-form";

export const metadata = { title: "Lessons — FSMS V2" };

function decisionVariant(decision: string | null): "success" | "warning" | "neutral" | "danger" {
  if (decision === "approved") return "success";
  if (decision === "declined") return "danger";
  return "warning"; // pending
}

function planText(plan: Record<string, unknown> | null | undefined): string {
  if (!plan) return "—";
  if (typeof plan.text === "string") return plan.text;
  try {
    return JSON.stringify(plan);
  } catch {
    return "—";
  }
}

export default async function LessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; cursor?: string }>;
}) {
  const [t, st, commonT] = await Promise.all([
    getTranslations("lessons"),
    getTranslations("status"),
    getTranslations("common"),
  ]);
  const profile = await requireUser();
  const sp = await searchParams;
  const ctx = await requireDbContext();
  const lessons = new LessonRepository(ctx);

  const canLog = profileCan(profile, "saveLessonLog");
  const canDelete = profileCan(profile, "deleteLessonLog");
  const canPlan = profileCan(profile, "prepareLesson");
  const canControl = profileCan(profile, "saveLessonControl");
  const canRequest = profileCan(profile, "requestLessonChange");
  const canDecide = profileCan(profile, "decideLessonChange");

  const classesRes = await new ClassRepository(ctx).search({ pageSize: 100 });
  const classes = classesRes.ok ? classesRes.data.items : [];
  const selectedClassId = sp.class ?? null;

  const [spine, logs, plans, changes, controls] = await Promise.all([
    lessons.spine({}),
    lessons.logs({ classId: selectedClassId ?? undefined, pageSize: 30, cursor: sp.cursor }),
    canPlan ? lessons.plans({ classId: selectedClassId ?? undefined }) : Promise.resolve(null),
    lessons.changes({ classId: selectedClassId ?? undefined }),
    canControl ? lessons.controls({ classId: selectedClassId ?? undefined }) : Promise.resolve(null),
  ]);

  const lessonOptions: Array<{ id: string; label: string }> = [];
  if (spine.ok && spine.data) {
    for (const pr of spine.data.programmes) {
      for (const u of pr.units) {
        for (const l of u.lessons) {
          lessonOptions.push({ id: l.id, label: `${localized(l.title)} (${l.code ?? "?"})` });
        }
      }
    }
  }

  return (
    <PageShell title={t("title")} permission="lessonCalendar">
      <div className="grid gap-4">
        {canLog && (
          <Card>
            <CardHeader>
              <CardTitle>{t("history")}</CardTitle>
              <CardDescription>{t("historyDesc")}</CardDescription>
            </CardHeader>
            <CardBody>
              <LessonLogForm classes={classes} />
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t("history")}</CardTitle>
            <CardDescription>{t("historyDesc")}</CardDescription>
          </CardHeader>
          <CardBody className="px-0">
            <form method="get" className="flex flex-wrap items-center gap-2 px-4 pb-3">
              <select name="class" defaultValue={selectedClassId ?? ""} className="rounded-field border bg-surface px-3 py-2 text-sm text-ink">
                <option value="">{t("allClasses")}</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button type="submit" className="rounded-field bg-brand-600 px-3 py-2 text-sm text-ink-inverse hover:bg-brand-700">
                {commonT("filter")}
              </button>
            </form>

            {logs.ok ? (
              logs.data.items.length === 0 ? (
                <TableEmpty colSpan={7}>{t("noLessonRecords")}</TableEmpty>
              ) : (
                <>
                  <Table>
                    <THead>
                      <TR>
                        <TH>{commonT("date")}</TH>
                        <TH>{commonT("class")}</TH>
                        <TH>{commonT("lesson")}</TH>
                        <TH>{commonT("topic")}</TH>
                        <TH>{commonT("participation")}</TH>
                        <TH>{commonT("teacher")}</TH>
                        <TH className="text-right">{commonT("actions")}</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {logs.data.items.map((l) => (
                        <TR key={l.id}>
                          <TD>{l.date}</TD>
                          <TD>{l.class_name}</TD>
                          <TD>{l.lesson_no ?? "—"}</TD>
                          <TD>
                            <div className="font-medium">{l.topic ?? "—"}</div>
                            {l.teacher_note && <div className="text-xs text-ink-muted">{l.teacher_note}</div>}
                          </TD>
                          <TD>{l.participation ?? "—"}{l.duration_min ? ` · ${l.duration_min}m` : ""}</TD>
                          <TD>{l.teacher_name ?? "—"}</TD>
                          <TD className="text-right">
                            {canDelete ? <LessonLogDeleteForm logId={l.id} /> : <span className="text-xs text-ink-faint">—</span>}
                          </TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                  <CursorPager
                    basePath="/lessons"
                    total={logs.data.total}
                    shown={logs.data.items.length}
                    nextCursor={logs.data.nextCursor}
                    extraParams={selectedClassId ? { class: selectedClassId } : undefined}
                  />
                </>
              )
            ) : (
              <p className="px-4 pb-3 text-sm text-danger-600">{logs.error.code}: {logs.error.message}</p>
            )}
          </CardBody>
        </Card>

        {canPlan && (
          <Card>
            <CardHeader>
              <CardTitle>{t("lessonPlans")}</CardTitle>
              <CardDescription>{t("lessonPlansDesc")}</CardDescription>
            </CardHeader>
            <CardBody>
              <LessonPlanForm classes={classes} lessons={lessonOptions} />
            </CardBody>
            <CardBody className="px-0 pt-0">
              {plans && plans.ok && plans.data.length > 0 && (
                <Table>
                  <THead>
                    <TR>
                      <TH>{commonT("class")}</TH>
                      <TH>{commonT("lesson")}</TH>
                      <TH>{commonT("teacher")}</TH>
                      <TH>{commonT("plan")}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {plans.data.map((p) => (
                      <TR key={p.id}>
                        <TD>{p.class_name ?? "—"}</TD>
                        <TD>{localized(p.lesson_title) || "—"}</TD>
                        <TD>{p.teacher_name ?? "—"}</TD>
                        <TD className="max-w-md">
                          <div className="whitespace-pre-wrap text-sm">{planText(p.plan)}</div>
                          {p.source && <div className="text-xs text-ink-faint">{commonT("source")}: {p.source}</div>}
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{t("curriculum")}</CardTitle>
            <CardDescription>{t("curriculumDesc")}</CardDescription>
          </CardHeader>
          <CardBody>
            {spine.ok && spine.data && spine.data.programmes.length > 0 ? (
              <ul className="grid gap-3">
                {spine.data.programmes.map((pr) => (
                  <li key={pr.id}>
                    <div className="text-sm font-semibold text-ink">
                      {localized(pr.name)} {pr.code ? <span className="text-ink-faint">({pr.code})</span> : null}
                    </div>
                    <ul className="ml-4 mt-1 grid gap-2 border-l border-line pl-3">
                      {pr.units.map((u) => (
                        <li key={u.id}>
                          <div className="text-sm text-ink-muted">
                            {localized(u.title)} {u.code ? <span className="text-ink-faint">({u.code})</span> : null}
                          </div>
                          <ul className="ml-4 mt-1 grid gap-1">
                            {u.lessons.map((l) => (
                              <li key={l.id} className="flex items-center gap-2 text-sm">
                                <Link href={`/lessons/${l.id}`} className="text-brand-700 hover:underline">
                                  {localized(l.title)}
                                </Link>
                                <span className="text-xs text-ink-faint">
                                  {l.objective_count} {commonT(l.objective_count === 1 ? "objective" : "objectives")}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-muted">{t("noCurriculum")}</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("lessonChanges")}</CardTitle>
            <CardDescription>{t("lessonChangesDesc")}</CardDescription>
          </CardHeader>
          <CardBody>
            {canRequest && <LessonChangeRequestForm classes={classes} />}
          </CardBody>
          <CardBody className="px-0 pt-0">
            {changes.ok && changes.data.length > 0 ? (
              <Table>
                <THead>
                  <TR>
                    <TH>{commonT("class")}</TH>
                    <TH>{commonT("from")}</TH>
                    <TH>{commonT("to")}</TH>
                    <TH>{commonT("reason")}</TH>
                    <TH>{commonT("status")}</TH>
                    <TH className="text-right">{commonT("decision")}</TH>
                  </TR>
                </THead>
                <TBody>
                  {changes.data.map((c) => (
                    <TR key={c.id}>
                      <TD>{c.class_name ?? "—"}</TD>
                      <TD>{c.from_date ?? "—"}</TD>
                      <TD>{c.to_date ?? <span className="text-ink-faint">{t("cancel")}</span>}</TD>
                      <TD className="max-w-xs">
                        <div className="text-sm">{c.reason ?? "—"}</div>
                        <div className="text-xs text-ink-faint">{commonT("by")} {c.requested_by_name ?? "—"}</div>
                      </TD>
                      <TD><Badge variant={decisionVariant(c.decision)}>{c.decision ? statusT(st, c.decision) : statusT(st, "pending")}</Badge></TD>
                      <TD className="text-right">
                        {canDecide && !c.decision ? (
                          <LessonChangeDecideForm changeId={c.id} />
                        ) : (
                          <span className="text-xs text-ink-faint">{c.decided_by_name ?? "—"}</span>
                        )}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            ) : (
              <TableEmpty colSpan={6}>{t("noChangeRequests")}</TableEmpty>
            )}
          </CardBody>
        </Card>

        {canControl && (
          <Card>
            <CardHeader>
              <CardTitle>{t("lessonControls")}</CardTitle>
              <CardDescription>{t("lessonControlsDesc")}</CardDescription>
            </CardHeader>
            <CardBody>
              <LessonControlForm classes={classes} />
            </CardBody>
            <CardBody className="px-0 pt-0">
              {controls && controls.ok && controls.data.length > 0 && (
                <Table>
                  <THead>
                    <TR>
                      <TH>{commonT("class")}</TH>
                      <TH>{commonT("key")}</TH>
                      <TH>{commonT("value")}</TH>
                      <TH>{commonT("updated")}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {controls.data.map((c) => (
                      <TR key={c.id}>
                        <TD>{c.class_name ?? "—"}</TD>
                        <TD>{c.key}</TD>
                        <TD>
                          <span className="font-mono text-sm">{JSON.stringify(c.value)}</span>
                        </TD>
                        <TD className="text-xs text-ink-faint">{c.updated_by_name ?? "—"}</TD>
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

function statusT(st: (k: string) => string, value: string): string {
  const k = value.toLowerCase();
  const out = st(k);
  return out !== k ? out : value;
}
