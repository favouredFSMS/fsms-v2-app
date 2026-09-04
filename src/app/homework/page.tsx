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

export default async function HomeworkPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; status?: string; cursor?: string }>;
}) {
  const profile = await requireUser();
  const sp = await searchParams;
  const ctx = await requireDbContext();
  const homework = new HomeworkRepository(ctx);

  const canAssign = profileCan(profile, "saveHomework");
  const canGrade = profileCan(profile, "gradeHomework");
  const canSubmit = profileCan(profile, "submitHomework");

  if (!canAssign) {
    // Family / student view: their own homework.
    const list = await homework.list({ pageSize: 50, cursor: sp.cursor });
    const classes = await new ClassRepository(ctx).search({ pageSize: 100 });
    const classOptions = classes.ok ? classes.data.items : [];

    return (
      <PageShell title="Homework" permission="homework">
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>My homework</CardTitle>
              <CardDescription>Assignments for you and your children.</CardDescription>
            </CardHeader>
            <CardBody className="px-0">
              {list.ok ? (
                list.data.items.length === 0 ? (
                  <TableEmpty colSpan={4}>No homework.</TableEmpty>
                ) : (
                  <>
                    <Table>
                      <THead>
                        <TR>
                          <TH>Date</TH>
                          <TH>Class</TH>
                          <TH>Title</TH>
                          <TH>Status</TH>
                          <TH className="text-right">Action</TH>
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
                                {h.student_name}{h.due_date ? ` · due ${h.due_date}` : ""}
                              </div>
                              {h.score && <div className="text-xs text-success-700">Score: {h.score}</div>}
                              {h.feedback && <div className="text-xs text-ink-muted">{h.feedback}</div>}
                            </TD>
                            <TD><Badge variant={statusVariant(h.status)}>{h.status}</Badge></TD>
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
            <EmptyState icon="info" title="No classes" description="Homework appears once you are enrolled or linked." />
          )}
        </div>
      </PageShell>
    );
  }

  // Staff workflow: assign + list + grade.
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
    <PageShell title="Homework" permission="homework">
      <div className="grid gap-4">
        {canAssign && selectedClassId && roster?.ok && roster.data && (
          <Card>
            <CardHeader>
              <CardTitle>Assign homework</CardTitle>
              <CardDescription>Assign a task to every active student in the class.</CardDescription>
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
            <CardTitle>Homework</CardTitle>
            <CardDescription>Assignments, submissions and grading.</CardDescription>
          </CardHeader>
          <CardBody className="px-0">
            <form method="get" className="flex flex-wrap items-center gap-2 px-4 pb-3">
              <select name="class" defaultValue={selectedClassId ?? ""} className="rounded-field border bg-surface px-3 py-2 text-sm text-ink">
                <option value="">All classes</option>
                {list.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <select name="status" defaultValue={sp.status ?? ""} className="rounded-field border bg-surface px-3 py-2 text-sm text-ink">
                <option value="">All statuses</option>
                <option value="assigned">assigned</option>
                <option value="submitted">submitted</option>
                <option value="graded">graded</option>
                <option value="overdue">overdue</option>
                <option value="missing">missing</option>
              </select>
              <button type="submit" className="rounded-field bg-brand-600 px-3 py-2 text-sm text-ink-inverse hover:bg-brand-700">
                Filter
              </button>
            </form>

            {items.ok ? (
              items.data.items.length === 0 ? (
                <TableEmpty colSpan={6}>No homework records.</TableEmpty>
              ) : (
                <>
                  <Table>
                    <THead>
                      <TR>
                        <TH>Date</TH>
                        <TH>Student</TH>
                        <TH>Title</TH>
                        <TH>Status</TH>
                        <TH>Submissions</TH>
                        <TH className="text-right">Grade</TH>
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
                          <TD><Badge variant={statusVariant(h.status)}>{h.status}</Badge></TD>
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
