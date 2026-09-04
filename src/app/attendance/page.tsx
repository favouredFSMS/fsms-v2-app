import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR, TableEmpty } from "@/components/ui/table";
import { CursorPager } from "@/components/ui/cursor-pager";
import { EmptyState } from "@/components/ui/states";
import {
  requireDbContext,
  AttendanceRepository,
  ClassRepository,
  StudentRepository,
} from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { profileCan } from "@/lib/auth/authorize";
import { AttendanceSheet } from "@/components/attendance/attendance-sheet";

export const metadata = { title: "Attendance — FSMS V2" };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string; date?: string; cursor?: string }>;
}) {
  const profile = await requireUser();
  const sp = await searchParams;
  const ctx = await requireDbContext();
  const attendance = new AttendanceRepository(ctx);

  const canMark = profileCan(profile, "attendanceSheet");

  if (!canMark) {
    // Family / student view: their own attendance summaries.
    const mine = await new StudentRepository(ctx).search({ pageSize: 100 });
    const children = mine.ok ? mine.data.items : [];
    const summaries = await Promise.all(
      children.map((c) => attendance.myAttendance(c.id)),
    );

    return (
      <PageShell title="Attendance" permission="attendanceGrid">
        <div className="grid gap-4">
          {summaries.map((res, i) => {
            const child = children[i];
            if (!res.ok || !res.data) return null;
            const d = res.data;
            const t = d.totals;
            return (
              <Card key={child.id}>
                <CardHeader>
                  <CardTitle>{child.name}</CardTitle>
                  <CardDescription>Attendance summary</CardDescription>
                </CardHeader>
                <CardBody>
                  <div className="grid gap-4 sm:grid-cols-4">
                    <Stat label="Present" value={String(t.present)} variant="success" />
                    <Stat label="Late" value={String(t.late)} variant="warning" />
                    <Stat label="Absent" value={String(t.absent)} variant="danger" />
                    <Stat label="Rate" value={t.rate == null ? "—" : `${t.rate}%`} variant="info" />
                  </div>

                  {d.recent.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-ink-muted">Recent</h3>
                      <ul className="mt-1 divide-y divide-line text-sm">
                        {d.recent.map((r, j) => (
                          <li key={j} className="flex items-center gap-2 py-1.5">
                            <span className="text-ink-faint">{r.date}</span>
                            <span>{r.class_name ?? "—"}</span>
                            <Badge variant={r.status === "present" ? "success" : r.status === "late" ? "warning" : "danger"}>
                              {r.status}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {d.by_class.length > 0 && (
                    <div className="mt-4">
                      <h3 className="text-sm font-medium text-ink-muted">By class</h3>
                      <Table>
                        <THead>
                          <TR>
                            <TH>Class</TH>
                            <TH className="text-right">Present</TH>
                            <TH className="text-right">Late</TH>
                            <TH className="text-right">Absent</TH>
                          </TR>
                        </THead>
                        <TBody>
                          {d.by_class.map((b) => (
                            <TR key={b.class_id}>
                              <TD>{b.class_name}</TD>
                              <TD className="text-right">{b.present}</TD>
                              <TD className="text-right">{b.late}</TD>
                              <TD className="text-right">{b.absent}</TD>
                            </TR>
                          ))}
                        </TBody>
                      </Table>
                    </div>
                  )}
                </CardBody>
              </Card>
            );
          })}
          {children.length === 0 && (
            <EmptyState
              icon="info"
              title="No linked students"
              description="Attendance appears here once students are linked to your account."
            />
          )}
        </div>
      </PageShell>
    );
  }

  // Staff workflow: pick a class + date, mark the sheet, review stats/history.
  const classes = await new ClassRepository(ctx).search({ pageSize: 100 });
  const list = classes.ok ? classes.data.items : [];
  const selectedClassId = sp.class ?? list[0]?.id ?? null;
  const selectedDate = sp.date ?? today();

  const grid = selectedClassId
    ? await attendance.grid({ classId: selectedClassId, date: selectedDate })
    : null;
  const stats = selectedClassId ? await attendance.stats({ classId: selectedClassId }) : null;
  const history = selectedClassId
    ? await attendance.history({ classId: selectedClassId, pageSize: 20, cursor: sp.cursor })
    : null;

  return (
    <PageShell title="Attendance" permission="attendanceGrid">
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Mark attendance</CardTitle>
            <CardDescription>Bulk-mark a class for a date — one save per class.</CardDescription>
          </CardHeader>
          <CardBody className="px-0">
            <form method="get" className="flex flex-wrap items-center gap-2 px-4 pb-3">
              <select name="class" defaultValue={selectedClassId ?? ""} className="rounded-field border bg-surface px-3 py-2 text-sm text-ink">
                <option value="">Select a class…</option>
                {list.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <input
                type="date"
                name="date"
                defaultValue={selectedDate}
                className="rounded-field border bg-surface px-3 py-2 text-sm text-ink"
              />
              <button type="submit" className="rounded-field bg-brand-600 px-3 py-2 text-sm text-ink-inverse hover:bg-brand-700">
                Load
              </button>
            </form>

            {!selectedClassId ? (
              <p className="px-4 pb-3 text-sm text-ink-faint">Select a class to load the marking sheet.</p>
            ) : !grid || !grid.ok || !grid.data ? (
              <p className="px-4 pb-3 text-sm text-ink-faint">No marking sheet available.</p>
            ) : (
              <div className="px-4 pb-3">
                <AttendanceSheet classId={selectedClassId} date={selectedDate} students={grid.data.students} />
              </div>
            )}
          </CardBody>
        </Card>

        {stats?.ok && stats.data && (
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
              <CardDescription>Per-student totals for {stats.data.class?.name}.</CardDescription>
            </CardHeader>
            <CardBody className="px-0">
              <Table>
                <THead>
                  <TR>
                    <TH>Student</TH>
                    <TH className="text-right">Present</TH>
                    <TH className="text-right">Late</TH>
                    <TH className="text-right">Absent</TH>
                    <TH className="text-right">Rate</TH>
                  </TR>
                </THead>
                <TBody>
                  {stats.data.students.map((s) => (
                    <TR key={s.id}>
                      <TD className="font-medium">{s.name}</TD>
                      <TD className="text-right">{s.present}</TD>
                      <TD className="text-right">{s.late}</TD>
                      <TD className="text-right">{s.absent}</TD>
                      <TD className="text-right">{s.rate == null ? "—" : `${s.rate}%`}</TD>
                    </TR>
                  ))}
                  {stats.data.students.length === 0 && <TableEmpty colSpan={5}>No students.</TableEmpty>}
                </TBody>
              </Table>
            </CardBody>
          </Card>
        )}

        {history?.ok && (
          <Card>
            <CardHeader>
              <CardTitle>History</CardTitle>
              <CardDescription>Most recent records for this class.</CardDescription>
            </CardHeader>
            <CardBody className="px-0">
              <Table>
                <THead>
                  <TR>
                    <TH>Date</TH>
                    <TH>Student</TH>
                    <TH>Status</TH>
                    <TH>Late</TH>
                    <TH>By</TH>
                  </TR>
                </THead>
                <TBody>
                  {history.data.items.map((h) => (
                    <TR key={h.id}>
                      <TD>{h.date}</TD>
                      <TD className="font-medium">{h.student_name}</TD>
                      <TD>
                        <Badge variant={h.status === "present" ? "success" : h.status === "late" ? "warning" : "danger"}>
                          {h.status}
                        </Badge>
                      </TD>
                      <TD>{h.minutes_late > 0 ? `${h.minutes_late}′` : "—"}</TD>
                      <TD className="text-xs text-ink-faint">{h.taken_by ?? "—"}</TD>
                    </TR>
                  ))}
                  {history.data.items.length === 0 && <TableEmpty colSpan={5}>No records yet.</TableEmpty>}
                </TBody>
              </Table>
              <CursorPager
                basePath="/attendance"
                total={history.data.total}
                shown={history.data.items.length}
                nextCursor={history.data.nextCursor}
              />
            </CardBody>
          </Card>
        )}
      </div>
    </PageShell>
  );
}

function Stat({ label, value, variant }: { label: string; value: string; variant: "success" | "warning" | "danger" | "info" }) {
  return (
    <div className="rounded-field border border-line p-3">
      <div className="text-xs text-ink-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-ink">{value}</div>
      <Badge variant={variant} className="mt-1">{label}</Badge>
    </div>
  );
}
