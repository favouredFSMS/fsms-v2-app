import { PageShell } from "@/components/layout/page-shell";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR, TableEmpty } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { requireUser } from "@/lib/auth/guards";
import { profileCan } from "@/lib/auth/authorize";
import {
  requireDbContext,
  ReportingRepository,
  ClassRepository,
  StudentRepository,
  UserRepository,
  type StudentProgressReport,
  type LearnerProgressOverview,
  type AttendanceReport,
  type AssessmentReport,
  type ClassReport,
  type TeacherReport,
  type CurriculumCoverage,
  type CurriculumAnalytics,
  type ClassEarnings,
  type SalaryHistory,
} from "@/lib/db";
import { ReportPicker } from "@/components/reports/report-picker";
import { ExportPanel } from "@/components/reports/export-panel";

export const metadata = { title: "Reports — FSMS V2" };

type Search = {
  report?: string;
  class?: string;
  student?: string;
  teacher?: string;
  from?: string;
  to?: string;
  level?: string;
  month?: string;
};

const STAFF = ["admin1", "admin", "manager", "accountant", "secretary", "teacher"];
const LEADERSHIP = ["admin1", "admin", "manager"];
const OFFICE = ["admin1", "admin", "manager", "secretary"];

type ReportValue =
  | { kind: "pick"; hint: string }
  | { kind: "student"; value: StudentProgressReport | null }
  | { kind: "overview"; value: LearnerProgressOverview | null }
  | { kind: "attendance"; value: AttendanceReport | null }
  | { kind: "assessment"; value: AssessmentReport | null }
  | { kind: "class"; value: ClassReport | null }
  | { kind: "teacher"; value: TeacherReport | null }
  | { kind: "coverage"; value: CurriculumCoverage | null }
  | { kind: "analytics"; value: CurriculumAnalytics | null }
  | { kind: "earnings"; value: ClassEarnings | null }
  | { kind: "salary"; value: SalaryHistory | null };

const pct = (v: number | null | undefined) => (v == null ? "—" : `${v}%`);
const num = (v: number | null | undefined) => (v == null ? "—" : String(v));

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const profile = await requireUser();
  const sp = await searchParams;
  const ctx = await requireDbContext();
  const reporting = new ReportingRepository(ctx);

  const role = profile.role_base ?? "";
  const isStaff = STAFF.includes(role);
  const isLeadership = LEADERSHIP.includes(role);
  const isOffice = OFFICE.includes(role);
  const can = (a: string) => profileCan(profile, a);

  // ── report menu (permission-gated) ─────────────────────────────────────────
  const menu: { key: string; label: string }[] = [];
  if (can("studentProgressReport")) menu.push({ key: "student", label: "Student progress" });
  if (can("learnerProgressOverview")) menu.push({ key: "overview", label: "Learner overview" });
  if (can("attendanceSheet")) menu.push({ key: "attendance", label: "Attendance" });
  if (can("performance")) menu.push({ key: "assessment", label: "Assessments" });
  if (can("report")) menu.push({ key: "class", label: "Class report" });
  if (can("report") && isStaff) menu.push({ key: "teacher", label: "Teacher report" });
  if (can("curriculumCoverage")) menu.push({ key: "coverage", label: "Curriculum coverage" });
  if (can("curriculumAnalytics")) menu.push({ key: "analytics", label: "Curriculum analytics" });
  if (can("classEarnings")) menu.push({ key: "earnings", label: "Class earnings" });
  if (can("salaryHistory")) menu.push({ key: "salary", label: "Salary history" });

  const selected = sp.report ?? menu[0]?.key ?? "";

  // ── picker options ─────────────────────────────────────────────────────────
  const classNeeded = ["overview", "attendance", "assessment", "class", "coverage"].includes(selected);
  const studentNeeded = selected === "student";
  const teacherNeeded = selected === "teacher";

  const [classesRes, studentsRes, usersRes, exportListRes] = await Promise.all([
    classNeeded ? new ClassRepository(ctx).search({ pageSize: 100 }) : Promise.resolve(null),
    studentNeeded ? new StudentRepository(ctx).search({ pageSize: 100 }) : Promise.resolve(null),
    teacherNeeded && isLeadership ? new UserRepository(ctx).search({ role: "teacher", pageSize: 100 }) : Promise.resolve(null),
    isStaff ? reporting.exportList() : Promise.resolve(null),
  ]);

  const classes = (classesRes && classesRes.ok ? classesRes.data.items : []).map((c) => ({
    id: c.id,
    name: c.name ?? c.id,
  }));
  const students = (studentsRes && studentsRes.ok ? studentsRes.data.items : []).map((s) => ({
    id: s.id,
    name: s.name ?? s.student_no ?? s.id,
  }));
  const teachers = (usersRes && usersRes.ok ? usersRes.data.items : []).map((u) => ({
    id: u.id,
    name: u.name ?? u.email ?? u.id,
  }));

  // ── selected report data ───────────────────────────────────────────────────
  let data: ReportValue | null = null;

  if (selected === "student") {
    if (sp.student) {
      const res = await reporting.studentProgressReport({ studentId: sp.student });
      data = { kind: "student", value: res.ok ? res.data : null };
    } else {
      data = { kind: "pick", hint: "Choose a student to view their progress report." };
    }
  } else if (selected === "overview") {
    if (sp.class) {
      const res = await reporting.learnerProgressOverview({ classId: sp.class });
      data = { kind: "overview", value: res.ok ? res.data : null };
    } else {
      data = { kind: "pick", hint: "Choose a class to view the learner overview." };
    }
  } else if (selected === "attendance") {
    if (sp.class) {
      const res = await reporting.attendanceReport({ classId: sp.class, from: sp.from, to: sp.to });
      data = { kind: "attendance", value: res.ok ? res.data : null };
    } else {
      data = { kind: "pick", hint: "Choose a class to view the attendance report." };
    }
  } else if (selected === "assessment") {
    if (sp.class) {
      const res = await reporting.assessmentReport({ classId: sp.class, from: sp.from, to: sp.to });
      data = { kind: "assessment", value: res.ok ? res.data : null };
    } else {
      data = { kind: "pick", hint: "Choose a class to view the assessment report." };
    }
  } else if (selected === "class") {
    if (sp.class) {
      const res = await reporting.classReport({ classId: sp.class });
      data = { kind: "class", value: res.ok ? res.data : null };
    } else {
      data = { kind: "pick", hint: "Choose a class to view the class report." };
    }
  } else if (selected === "teacher") {
    const res = await reporting.teacherReport({ teacherId: sp.teacher });
    data = { kind: "teacher", value: res.ok ? res.data : null };
  } else if (selected === "coverage") {
    if (sp.class) {
      const res = await reporting.curriculumCoverage({ classId: sp.class, from: sp.from, to: sp.to });
      data = { kind: "coverage", value: res.ok ? res.data : null };
    } else {
      data = { kind: "pick", hint: "Choose a class to view curriculum coverage." };
    }
  } else if (selected === "analytics") {
    const res = await reporting.curriculumAnalytics({ level: sp.level });
    data = { kind: "analytics", value: res.ok ? res.data : null };
  } else if (selected === "earnings") {
    const res = await reporting.classEarnings({ from: sp.from, to: sp.to });
    data = { kind: "earnings", value: res.ok ? res.data : null };
  } else if (selected === "salary") {
    const res = await reporting.salaryHistory({ userId: sp.teacher, month: sp.month });
    data = { kind: "salary", value: res.ok ? res.data : null };
  }

  const jobs = exportListRes && exportListRes.ok && exportListRes.data ? exportListRes.data.rows : [];

  return (
    <PageShell title="Reports" permission="report">
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Reporting</CardTitle>
            <CardDescription>
              Progress, academic, attendance, assessment, class, teacher and administrative reports.
              Heavy CSV exports run asynchronously and never block normal use.
            </CardDescription>
          </CardHeader>
          <CardBody>
            {menu.length === 0 ? (
              <EmptyState icon="warning" title="No reports available" description="Your role has no reporting permissions." />
            ) : (
              <ReportPicker
                reports={menu}
                selected={selected}
                classes={classes}
                students={students}
                teachers={teachers}
                classId={sp.class}
                studentId={sp.student}
                teacherId={sp.teacher}
                from={sp.from}
                to={sp.to}
                level={sp.level}
                month={sp.month}
                showClass={classNeeded}
                showStudent={studentNeeded}
                showTeacher={teacherNeeded && isLeadership}
                showPeriod={selected === "attendance" || selected === "assessment" || selected === "coverage"}
                showLevel={selected === "analytics"}
                showMonth={selected === "salary"}
              />
            )}
          </CardBody>
        </Card>

        <ReportBody data={data} />
        {isStaff && <ExportPanel canProcess={isOffice} classes={classes} teachers={teachers} jobs={jobs} />}
      </div>
    </PageShell>
  );
}

function ReportBody({ data }: { data: ReportValue | null }) {
  if (!data) return null;
  if (data.kind === "pick") {
    return (
      <Card>
        <CardBody>
          <EmptyState icon="info" title="Select a target" description={data.hint} />
        </CardBody>
      </Card>
    );
  }
  if (data.value === null || data.value === undefined) {
    return (
      <Card>
        <CardBody>
          <EmptyState icon="warning" title="Not available" description="You do not have access to this report, or it has no data." />
        </CardBody>
      </Card>
    );
  }
  switch (data.kind) {
    case "student":
      return <StudentReportCard report={data.value} />;
    case "overview":
      return <OverviewCard report={data.value} />;
    case "attendance":
      return <AttendanceCard report={data.value} />;
    case "assessment":
      return <AssessmentCard report={data.value} />;
    case "class":
      return <ClassReportCard report={data.value} />;
    case "teacher":
      return <TeacherReportCard report={data.value} />;
    case "coverage":
      return <CoverageCard report={data.value} />;
    case "analytics":
      return <AnalyticsCard report={data.value} />;
    case "earnings":
      return <EarningsCard report={data.value} />;
    case "salary":
      return <SalaryCard report={data.value} />;
    default:
      return null;
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-200 bg-ink-50 px-3 py-2">
      <div className="text-xs text-ink-500">{label}</div>
      <div className="text-lg font-semibold text-ink-900">{value}</div>
    </div>
  );
}

function StudentReportCard({ report }: { report: StudentProgressReport }) {
  const s = report.student;
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Student progress — {s?.name ?? "?"}</CardTitle>
          <CardDescription>
            {[s?.student_no, s?.level_code, s?.academic_status].filter(Boolean).join(" · ") || "No details"}
          </CardDescription>
        </CardHeader>
        <CardBody>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Present" value={num(report.attendance?.present)} />
            <Stat label="Late" value={num(report.attendance?.late)} />
            <Stat label="Absent" value={num(report.attendance?.absent)} />
            <Stat label="Attendance rate" value={pct(report.attendance?.rate)} />
            <Stat label="Assessments" value={num(report.assessments?.count)} />
            <Stat label="Average score" value={num(report.assessments?.avg_score)} />
            <Stat label="Evidence" value={num(report.evidence?.count)} />
            <Stat label="Collected" value={num(report.balance?.collected)} />
          </div>
        </CardBody>
      </Card>

      {report.evidence_by_target.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Evidence by learning target</CardTitle>
          </CardHeader>
          <CardBody className="px-0">
            <Table>
              <THead>
                <TR>
                  <TH>Target</TH>
                  <TH>Level</TH>
                  <TH>Entries</TH>
                  <TH>Average</TH>
                  <TH>Last</TH>
                </TR>
              </THead>
              <TBody>
                {report.evidence_by_target.map((t) => (
                  <TR key={t.target_id}>
                    <TD>{t.target_title ?? t.target_id}</TD>
                    <TD>{t.level_code ?? "—"}</TD>
                    <TD>{t.count}</TD>
                    <TD>{num(t.avg_score)}</TD>
                    <TD>{t.last_at ?? "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardBody>
        </Card>
      )}

      {report.level_history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Level history</CardTitle>
          </CardHeader>
          <CardBody className="px-0">
            <Table>
              <THead>
                <TR>
                  <TH>Level</TH>
                  <TH>Started</TH>
                  <TH>Completed</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {report.level_history.map((h, i) => (
                  <TR key={i}>
                    <TD>{h.level_code ?? "—"}</TD>
                    <TD>{h.started_at ?? "—"}</TD>
                    <TD>{h.completed_at ?? "—"}</TD>
                    <TD>{h.status ?? "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

function OverviewCard({ report }: { report: LearnerProgressOverview }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Learner overview — {report.class?.name ?? "?"}</CardTitle>
        <CardDescription>Academic progress per enrolled student.</CardDescription>
      </CardHeader>
      <CardBody className="px-0">
        <Table>
          <THead>
            <TR>
              <TH>Student</TH>
              <TH>Level</TH>
              <TH>Status</TH>
              <TH>Evidence</TH>
              <TH>Evidence avg</TH>
              <TH>Attendance</TH>
              <TH>Assessment avg</TH>
            </TR>
          </THead>
          <TBody>
            {report.students.length === 0 ? (
              <TableEmpty colSpan={7}>No enrolled students.</TableEmpty>
            ) : (
              report.students.map((s) => (
                <TR key={s.id}>
                  <TD>{s.name}</TD>
                  <TD>{s.level_code ?? "—"}</TD>
                  <TD>{s.academic_status ?? "—"}</TD>
                  <TD>{s.evidence_count}</TD>
                  <TD>{num(s.evidence_avg)}</TD>
                  <TD>{pct(s.attendance_rate)}</TD>
                  <TD>{num(s.assessment_avg)}</TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </CardBody>
    </Card>
  );
}

function AttendanceCard({ report }: { report: AttendanceReport }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance — {report.class?.name ?? "?"}</CardTitle>
        <CardDescription>
          {report.range.from ?? "start"} → {report.range.to ?? "today"}
        </CardDescription>
      </CardHeader>
      <CardBody className="px-0">
        <Table>
          <THead>
            <TR>
              <TH>Student</TH>
              <TH>Present</TH>
              <TH>Late</TH>
              <TH>Absent</TH>
              <TH>Total</TH>
              <TH>Rate</TH>
            </TR>
          </THead>
          <TBody>
            {report.students.length === 0 ? (
              <TableEmpty colSpan={6}>No attendance recorded.</TableEmpty>
            ) : (
              report.students.map((s) => (
                <TR key={s.id}>
                  <TD>{s.name}</TD>
                  <TD>{s.present}</TD>
                  <TD>{s.late}</TD>
                  <TD>{s.absent}</TD>
                  <TD>{s.total}</TD>
                  <TD>{pct(s.rate)}</TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </CardBody>
    </Card>
  );
}

function AssessmentCard({ report }: { report: AssessmentReport }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Assessments — {report.class?.name ?? "?"}</CardTitle>
      </CardHeader>
      <CardBody className="px-0">
        <Table>
          <THead>
            <TR>
              <TH>Student</TH>
              <TH>Count</TH>
              <TH>Average</TH>
              <TH>Best</TH>
              <TH>Latest</TH>
            </TR>
          </THead>
          <TBody>
            {report.students.length === 0 ? (
              <TableEmpty colSpan={5}>No assessments recorded.</TableEmpty>
            ) : (
              report.students.map((s) => (
                <TR key={s.id}>
                  <TD>{s.name}</TD>
                  <TD>{s.count}</TD>
                  <TD>{num(s.avg_score)}</TD>
                  <TD>{num(s.best_score)}</TD>
                  <TD>{s.latest ?? "—"}</TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </CardBody>
    </Card>
  );
}

function ClassReportCard({ report }: { report: ClassReport }) {
  const c = report.class;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Class report — {c?.name ?? "?"}</CardTitle>
        <CardDescription>
          {[c?.level_code, c?.status, c?.days, c?.start_time ? `${c.start_time}–${c.end_time}` : null]
            .filter(Boolean)
            .join(" · ")}
        </CardDescription>
      </CardHeader>
      <CardBody>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Enrolment" value={num(report.enrolment)} />
          <Stat label="Attendance rate" value={pct(report.attendance_rate)} />
          <Stat label="Assessment avg" value={num(report.assessment_avg)} />
          <Stat label="Lessons taught" value={num(report.lessons_taught)} />
          <Stat label="Collected" value={num(report.balance?.collected)} />
          <Stat label="Pending" value={num(report.balance?.pending)} />
          <Stat label="Fee" value={c?.fee != null ? `${c.fee} ${c.fee_currency ?? ""}`.trim() : "—"} />
        </div>
        <div className="mt-4">
          <div className="text-sm font-medium text-ink-700">Teachers</div>
          {report.teachers.length === 0 ? (
            <p className="text-sm text-ink-500">No teachers assigned.</p>
          ) : (
            <div className="mt-1 flex flex-wrap gap-2">
              {report.teachers.map((t) => (
                <Badge key={t.id} variant={t.primary ? "brand" : "neutral"}>
                  {t.name}
                  {t.primary ? " · primary" : ""}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function TeacherReportCard({ report }: { report: TeacherReport }) {
  const t = report.teacher;
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Teacher report — {t?.name ?? "?"}</CardTitle>
          <CardDescription>{t?.email ?? ""}</CardDescription>
        </CardHeader>
        <CardBody>
          <div className="grid gap-2 sm:grid-cols-3">
            <Stat label="Classes" value={num(report.classes.length)} />
            <Stat label="Attendance days taken" value={num(report.attendance_taken)} />
            <Stat label="Salary total" value={num(report.salary?.total)} />
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Classes</CardTitle>
        </CardHeader>
        <CardBody className="px-0">
          <Table>
            <THead>
              <TR>
                <TH>Class</TH>
                <TH>Role</TH>
                <TH>Enrolment</TH>
                <TH>Attendance</TH>
                <TH>Lessons</TH>
              </TR>
            </THead>
            <TBody>
              {report.classes.length === 0 ? (
                <TableEmpty colSpan={5}>No classes assigned.</TableEmpty>
              ) : (
                report.classes.map((c) => (
                  <TR key={c.id}>
                    <TD>{c.name}</TD>
                    <TD>{c.primary ? "Primary" : "Assistant"}</TD>
                    <TD>{c.enrolment}</TD>
                    <TD>{pct(c.attendance_rate)}</TD>
                    <TD>{c.lessons_taught}</TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}

function CoverageCard({ report }: { report: CurriculumCoverage }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Curriculum coverage — {report.class?.name ?? "?"}</CardTitle>
        <CardDescription>
          Planned units vs lessons taught.
        </CardDescription>
      </CardHeader>
      <CardBody>
        <div className="grid gap-2 sm:grid-cols-2">
          <Stat label="Planned units" value={num(report.planned)} />
          <Stat label="Lessons taught" value={num(report.taught_count)} />
        </div>
      </CardBody>
      <CardBody className="px-0">
        <Table>
          <THead>
            <TR>
              <TH>Date</TH>
              <TH>Lesson</TH>
              <TH>Topic</TH>
              <TH>Teacher</TH>
            </TR>
          </THead>
          <TBody>
            {report.taught.length === 0 ? (
              <TableEmpty colSpan={4}>No lessons logged yet.</TableEmpty>
            ) : (
              report.taught.map((l, i) => (
                <TR key={i}>
                  <TD>{l.date ?? "—"}</TD>
                  <TD>{l.lesson_no ?? "—"}</TD>
                  <TD>{l.topic ?? "—"}</TD>
                  <TD>{l.teacher_name ?? "—"}</TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </CardBody>
    </Card>
  );
}

function AnalyticsCard({ report }: { report: CurriculumAnalytics }) {
  const groupRows = (rows: { level_code: string | null; count: number; [k: string]: unknown }[] | null) => rows ?? [];
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Curriculum analytics</CardTitle>
          <CardDescription>
            Programmes: {report.programmes} · Lessons: {report.lessons}
          </CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Learning targets by level</CardTitle>
        </CardHeader>
        <CardBody className="px-0">
          <Table>
            <THead>
              <TR>
                <TH>Level</TH>
                <TH>Targets</TH>
                <TH>Human-verified</TH>
              </TR>
            </THead>
            <TBody>
              {groupRows(report.targets as never).length === 0 ? (
                <TableEmpty colSpan={3}>No targets.</TableEmpty>
              ) : (
                groupRows(report.targets as never).map((r, i) => (
                  <TR key={i}>
                    <TD>{r.level_code ?? "—"}</TD>
                    <TD>{r.count}</TD>
                    <TD>{String(r.human_verified ?? 0)}</TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Evidence by level</CardTitle>
        </CardHeader>
        <CardBody className="px-0">
          <Table>
            <THead>
              <TR>
                <TH>Level</TH>
                <TH>Entries</TH>
                <TH>Average</TH>
              </TR>
            </THead>
            <TBody>
              {groupRows(report.evidence as never).length === 0 ? (
                <TableEmpty colSpan={3}>No evidence.</TableEmpty>
              ) : (
                groupRows(report.evidence as never).map((r, i) => (
                  <TR key={i}>
                    <TD>{r.level_code ?? "—"}</TD>
                    <TD>{r.count}</TD>
                    <TD>{num(r.avg_score as number)}</TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}

function EarningsCard({ report }: { report: ClassEarnings }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Class earnings</CardTitle>
        <CardDescription>Expected vs collected vs pending revenue per class.</CardDescription>
      </CardHeader>
      <CardBody className="px-0">
        <Table>
          <THead>
            <TR>
              <TH>Class</TH>
              <TH>Students</TH>
              <TH>Fee</TH>
              <TH>Expected</TH>
              <TH>Collected</TH>
              <TH>Pending</TH>
            </TR>
          </THead>
          <TBody>
            {report.rows.length === 0 ? (
              <TableEmpty colSpan={6}>No active classes.</TableEmpty>
            ) : (
              report.rows.map((r) => (
                <TR key={r.id}>
                  <TD>{r.name}</TD>
                  <TD>{r.students}</TD>
                  <TD>{num(r.fee)}</TD>
                  <TD>{num(r.expected)}</TD>
                  <TD>{num(r.collected)}</TD>
                  <TD>{num(r.pending)}</TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </CardBody>
    </Card>
  );
}

function SalaryCard({ report }: { report: SalaryHistory }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Salary history</CardTitle>
        <CardDescription>Total: {num(report.total)}</CardDescription>
      </CardHeader>
      <CardBody className="px-0">
        <Table>
          <THead>
            <TR>
              <TH>User</TH>
              <TH>Month</TH>
              <TH>Amount</TH>
              <TH>Currency</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {report.rows.length === 0 ? (
              <TableEmpty colSpan={5}>No salary records.</TableEmpty>
            ) : (
              report.rows.map((r) => (
                <TR key={r.id}>
                  <TD>{r.user_name ?? r.user_id}</TD>
                  <TD>{r.month}</TD>
                  <TD>{num(r.amount)}</TD>
                  <TD>{r.currency ?? "—"}</TD>
                  <TD>
                    <Badge variant={r.status === "paid" ? "success" : "neutral"}>{r.status ?? "—"}</Badge>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </CardBody>
    </Card>
  );
}
