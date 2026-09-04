import { getTranslations } from "next-intl/server";
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
  const [t, st, commonT] = await Promise.all([
    getTranslations("reports"),
    getTranslations("status"),
    getTranslations("common"),
  ]);
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
  if (can("studentProgressReport")) menu.push({ key: "student", label: t("studentProgress") });
  if (can("learnerProgressOverview")) menu.push({ key: "overview", label: t("learnerOverview") });
  if (can("attendanceSheet")) menu.push({ key: "attendance", label: t("attendanceTitle") });
  if (can("performance")) menu.push({ key: "assessment", label: t("assessmentsTitle") });
  if (can("report")) menu.push({ key: "class", label: t("classReport") });
  if (can("report") && isStaff) menu.push({ key: "teacher", label: t("teacherReport") });
  if (can("curriculumCoverage")) menu.push({ key: "coverage", label: t("curriculumCoverage") });
  if (can("curriculumAnalytics")) menu.push({ key: "analytics", label: t("curriculumAnalytics") });
  if (can("classEarnings")) menu.push({ key: "earnings", label: t("classEarnings") });
  if (can("salaryHistory")) menu.push({ key: "salary", label: t("salaryHistory") });

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
      data = { kind: "pick", hint: t("hintStudent") };
    }
  } else if (selected === "overview") {
    if (sp.class) {
      const res = await reporting.learnerProgressOverview({ classId: sp.class });
      data = { kind: "overview", value: res.ok ? res.data : null };
    } else {
      data = { kind: "pick", hint: t("hintOverview") };
    }
  } else if (selected === "attendance") {
    if (sp.class) {
      const res = await reporting.attendanceReport({ classId: sp.class, from: sp.from, to: sp.to });
      data = { kind: "attendance", value: res.ok ? res.data : null };
    } else {
      data = { kind: "pick", hint: t("hintAttendance") };
    }
  } else if (selected === "assessment") {
    if (sp.class) {
      const res = await reporting.assessmentReport({ classId: sp.class, from: sp.from, to: sp.to });
      data = { kind: "assessment", value: res.ok ? res.data : null };
    } else {
      data = { kind: "pick", hint: t("hintAssessment") };
    }
  } else if (selected === "class") {
    if (sp.class) {
      const res = await reporting.classReport({ classId: sp.class });
      data = { kind: "class", value: res.ok ? res.data : null };
    } else {
      data = { kind: "pick", hint: t("hintClass") };
    }
  } else if (selected === "teacher") {
    const res = await reporting.teacherReport({ teacherId: sp.teacher });
    data = { kind: "teacher", value: res.ok ? res.data : null };
  } else if (selected === "coverage") {
    if (sp.class) {
      const res = await reporting.curriculumCoverage({ classId: sp.class, from: sp.from, to: sp.to });
      data = { kind: "coverage", value: res.ok ? res.data : null };
    } else {
      data = { kind: "pick", hint: t("hintCoverage") };
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
    <PageShell title={t("title")} permission="report">
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("reporting")}</CardTitle>
            <CardDescription>{t("reportingDesc")}</CardDescription>
          </CardHeader>
          <CardBody>
            {menu.length === 0 ? (
              <EmptyState icon="warning" title={t("noReports")} description={t("noReportsDesc")} />
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

        <ReportBody data={data} t={t} st={st} commonT={commonT} />
        {isStaff && <ExportPanel canProcess={isOffice} classes={classes} teachers={teachers} jobs={jobs} />}
      </div>
    </PageShell>
  );
}

type AnyT = {
  (key: string, values?: Record<string, string | number | Date>): string;
  has(key: string): boolean;
};

function ReportBody({
  data,
  t,
  st,
  commonT,
}: {
  data: ReportValue | null;
  t: AnyT;
  st: AnyT;
  commonT: AnyT;
}) {
  if (!data) return null;
  if (data.kind === "pick") {
    return (
      <Card>
        <CardBody>
          <EmptyState icon="info" title={t("selectTarget")} description={data.hint} />
        </CardBody>
      </Card>
    );
  }
  if (data.value === null || data.value === undefined) {
    return (
      <Card>
        <CardBody>
          <EmptyState icon="warning" title={t("notAvailable")} description={t("notAvailableDesc")} />
        </CardBody>
      </Card>
    );
  }
  switch (data.kind) {
    case "student":
      return <StudentReportCard report={data.value} t={t} commonT={commonT} />;
    case "overview":
      return <OverviewCard report={data.value} t={t} commonT={commonT} />;
    case "attendance":
      return <AttendanceCard report={data.value} t={t} commonT={commonT} />;
    case "assessment":
      return <AssessmentCard report={data.value} t={t} commonT={commonT} />;
    case "class":
      return <ClassReportCard report={data.value} t={t} commonT={commonT} />;
    case "teacher":
      return <TeacherReportCard report={data.value} t={t} commonT={commonT} />;
    case "coverage":
      return <CoverageCard report={data.value} t={t} commonT={commonT} />;
    case "analytics":
      return <AnalyticsCard report={data.value} t={t} commonT={commonT} />;
    case "earnings":
      return <EarningsCard report={data.value} t={t} commonT={commonT} />;
    case "salary":
      return <SalaryCard report={data.value} t={t} st={st} commonT={commonT} />;
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

function StudentReportCard({
  report,
  t,
  commonT,
}: {
  report: StudentProgressReport;
  t: AnyT;
  commonT: AnyT;
}) {
  const s = report.student;
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>
            {t("studentProgress")} — {s?.name ?? "?"}
          </CardTitle>
          <CardDescription>
            {[s?.student_no, s?.level_code, s?.academic_status].filter(Boolean).join(" · ") || t("noDetails")}
          </CardDescription>
        </CardHeader>
        <CardBody>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label={t("present")} value={num(report.attendance?.present)} />
            <Stat label={t("late")} value={num(report.attendance?.late)} />
            <Stat label={t("absent")} value={num(report.attendance?.absent)} />
            <Stat label={t("attendanceRate")} value={pct(report.attendance?.rate)} />
            <Stat label={t("assessmentsTitle")} value={num(report.assessments?.count)} />
            <Stat label={t("averageScore")} value={num(report.assessments?.avg_score)} />
            <Stat label={t("evidenceCount")} value={num(report.evidence?.count)} />
            <Stat label={t("collected")} value={num(report.balance?.collected)} />
          </div>
        </CardBody>
      </Card>

      {report.evidence_by_target.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("evidenceByTarget")}</CardTitle>
          </CardHeader>
          <CardBody className="px-0">
            <Table>
              <THead>
                <TR>
                  <TH>{commonT("target")}</TH>
                  <TH>{commonT("level")}</TH>
                  <TH>{t("entries")}</TH>
                  <TH>{t("average")}</TH>
                  <TH>{t("last")}</TH>
                </TR>
              </THead>
              <TBody>
                {report.evidence_by_target.map((r) => (
                  <TR key={r.target_id}>
                    <TD>{r.target_title ?? r.target_id}</TD>
                    <TD>{r.level_code ?? "—"}</TD>
                    <TD>{r.count}</TD>
                    <TD>{num(r.avg_score)}</TD>
                    <TD>{r.last_at ?? "—"}</TD>
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
            <CardTitle>{t("levelHistory")}</CardTitle>
          </CardHeader>
          <CardBody className="px-0">
            <Table>
              <THead>
                <TR>
                  <TH>{commonT("level")}</TH>
                  <TH>{t("started")}</TH>
                  <TH>{t("completed")}</TH>
                  <TH>{commonT("status")}</TH>
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

function OverviewCard({
  report,
  t,
  commonT,
}: {
  report: LearnerProgressOverview;
  t: AnyT;
  commonT: AnyT;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t("learnerOverview")} — {report.class?.name ?? "?"}
        </CardTitle>
        <CardDescription>{t("learnerOverviewDesc")}</CardDescription>
      </CardHeader>
      <CardBody className="px-0">
        <Table>
          <THead>
            <TR>
              <TH>{commonT("student")}</TH>
              <TH>{commonT("level")}</TH>
              <TH>{commonT("status")}</TH>
              <TH>{t("evidenceCount")}</TH>
              <TH>{t("evidenceAvg")}</TH>
              <TH>{t("attendanceAvg")}</TH>
              <TH>{t("assessmentAvg")}</TH>
            </TR>
          </THead>
          <TBody>
            {report.students.length === 0 ? (
              <TableEmpty colSpan={7}>{t("noEnrolled")}</TableEmpty>
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

function AttendanceCard({
  report,
  t,
  commonT,
}: {
  report: AttendanceReport;
  t: AnyT;
  commonT: AnyT;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t("attendanceTitle")} — {report.class?.name ?? "?"}
        </CardTitle>
        <CardDescription>
          {report.range.from ?? t("start")} → {report.range.to ?? t("today")}
        </CardDescription>
      </CardHeader>
      <CardBody className="px-0">
        <Table>
          <THead>
            <TR>
              <TH>{commonT("student")}</TH>
              <TH>{t("present")}</TH>
              <TH>{t("late")}</TH>
              <TH>{t("absent")}</TH>
              <TH>{t("total")}</TH>
              <TH>{t("rate")}</TH>
            </TR>
          </THead>
          <TBody>
            {report.students.length === 0 ? (
              <TableEmpty colSpan={6}>{t("noAttendance")}</TableEmpty>
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

function AssessmentCard({
  report,
  t,
  commonT,
}: {
  report: AssessmentReport;
  t: AnyT;
  commonT: AnyT;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t("assessmentsTitle")} — {report.class?.name ?? "?"}
        </CardTitle>
      </CardHeader>
      <CardBody className="px-0">
        <Table>
          <THead>
            <TR>
              <TH>{commonT("student")}</TH>
              <TH>{t("count")}</TH>
              <TH>{t("average")}</TH>
              <TH>{t("best")}</TH>
              <TH>{t("latest")}</TH>
            </TR>
          </THead>
          <TBody>
            {report.students.length === 0 ? (
              <TableEmpty colSpan={5}>{t("noAssessments")}</TableEmpty>
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

function ClassReportCard({
  report,
  t,
  commonT,
}: {
  report: ClassReport;
  t: AnyT;
  commonT: AnyT;
}) {
  const c = report.class;
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t("classReport")} — {c?.name ?? "?"}
        </CardTitle>
        <CardDescription>
          {[c?.level_code, c?.status, c?.days, c?.start_time ? `${c.start_time}–${c.end_time}` : null]
            .filter(Boolean)
            .join(" · ")}
        </CardDescription>
      </CardHeader>
      <CardBody>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label={t("enrolment")} value={num(report.enrolment)} />
          <Stat label={t("attendanceRate")} value={pct(report.attendance_rate)} />
          <Stat label={t("assessmentAvg")} value={num(report.assessment_avg)} />
          <Stat label={t("lessonsTaught")} value={num(report.lessons_taught)} />
          <Stat label={t("collected")} value={num(report.balance?.collected)} />
          <Stat label={t("pending")} value={num(report.balance?.pending)} />
          <Stat label={commonT("fee")} value={c?.fee != null ? `${c.fee} ${c.fee_currency ?? ""}`.trim() : "—"} />
        </div>
        <div className="mt-4">
          <div className="text-sm font-medium text-ink-700">{commonT("teachers")}</div>
          {report.teachers.length === 0 ? (
            <p className="text-sm text-ink-500">{t("noTeachersAssigned")}</p>
          ) : (
            <div className="mt-1 flex flex-wrap gap-2">
              {report.teachers.map((r) => (
                <Badge key={r.id} variant={r.primary ? "brand" : "neutral"}>
                  {r.name}
                  {r.primary ? ` · ${t("primary")}` : ""}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

function TeacherReportCard({
  report,
  t,
  commonT,
}: {
  report: TeacherReport;
  t: AnyT;
  commonT: AnyT;
}) {
  const r = report.teacher;
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>
            {t("teacherReport")} — {r?.name ?? "?"}
          </CardTitle>
          <CardDescription>{r?.email ?? ""}</CardDescription>
        </CardHeader>
        <CardBody>
          <div className="grid gap-2 sm:grid-cols-3">
            <Stat label={commonT("classes")} value={num(report.classes.length)} />
            <Stat label={t("attendanceDaysTaken")} value={num(report.attendance_taken)} />
            <Stat label={t("salaryTotal")} value={num(report.salary?.total)} />
          </div>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{commonT("classes")}</CardTitle>
        </CardHeader>
        <CardBody className="px-0">
          <Table>
            <THead>
              <TR>
                <TH>{commonT("class")}</TH>
                <TH>{commonT("role")}</TH>
                <TH>{t("enrolment")}</TH>
                <TH>{t("attendanceAvg")}</TH>
                <TH>{commonT("lessons")}</TH>
              </TR>
            </THead>
            <TBody>
              {report.classes.length === 0 ? (
                <TableEmpty colSpan={5}>{t("noClassesAssigned")}</TableEmpty>
              ) : (
                report.classes.map((c) => (
                  <TR key={c.id}>
                    <TD>{c.name}</TD>
                    <TD>{c.primary ? t("primary") : t("assistant")}</TD>
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

function CoverageCard({
  report,
  t,
  commonT,
}: {
  report: CurriculumCoverage;
  t: AnyT;
  commonT: AnyT;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {t("curriculumCoverage")} — {report.class?.name ?? "?"}
        </CardTitle>
        <CardDescription>{t("coverageDesc")}</CardDescription>
      </CardHeader>
      <CardBody>
        <div className="grid gap-2 sm:grid-cols-2">
          <Stat label={t("plannedUnits")} value={num(report.planned)} />
          <Stat label={t("lessonsTaught")} value={num(report.taught_count)} />
        </div>
      </CardBody>
      <CardBody className="px-0">
        <Table>
          <THead>
            <TR>
              <TH>{commonT("date")}</TH>
              <TH>{commonT("lesson")}</TH>
              <TH>{commonT("topic")}</TH>
              <TH>{commonT("teacher")}</TH>
            </TR>
          </THead>
          <TBody>
            {report.taught.length === 0 ? (
              <TableEmpty colSpan={4}>{t("noLessonsLogged")}</TableEmpty>
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

function AnalyticsCard({
  report,
  t,
  commonT,
}: {
  report: CurriculumAnalytics;
  t: AnyT;
  commonT: AnyT;
}) {
  const groupRows = (rows: { level_code: string | null; count: number; [k: string]: unknown }[] | null) => rows ?? [];
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t("curriculumAnalytics")}</CardTitle>
          <CardDescription>
            {t("analyticsDesc", { programmes: report.programmes, lessons: report.lessons })}
          </CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("targetsByLevel")}</CardTitle>
        </CardHeader>
        <CardBody className="px-0">
          <Table>
            <THead>
              <TR>
                <TH>{commonT("level")}</TH>
                <TH>{t("targets")}</TH>
                <TH>{t("humanVerified")}</TH>
              </TR>
            </THead>
            <TBody>
              {groupRows(report.targets as never).length === 0 ? (
                <TableEmpty colSpan={3}>{t("noTargets")}</TableEmpty>
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
          <CardTitle>{t("evidenceByLevel")}</CardTitle>
        </CardHeader>
        <CardBody className="px-0">
          <Table>
            <THead>
              <TR>
                <TH>{commonT("level")}</TH>
                <TH>{t("entries")}</TH>
                <TH>{t("average")}</TH>
              </TR>
            </THead>
            <TBody>
              {groupRows(report.evidence as never).length === 0 ? (
                <TableEmpty colSpan={3}>{t("noEvidence")}</TableEmpty>
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

function EarningsCard({
  report,
  t,
  commonT,
}: {
  report: ClassEarnings;
  t: AnyT;
  commonT: AnyT;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("classEarnings")}</CardTitle>
        <CardDescription>{t("classEarningsDesc")}</CardDescription>
      </CardHeader>
      <CardBody className="px-0">
        <Table>
          <THead>
            <TR>
              <TH>{commonT("class")}</TH>
              <TH>{commonT("students")}</TH>
              <TH>{commonT("fee")}</TH>
              <TH>{t("expected")}</TH>
              <TH>{t("collected")}</TH>
              <TH>{t("pending")}</TH>
            </TR>
          </THead>
          <TBody>
            {report.rows.length === 0 ? (
              <TableEmpty colSpan={6}>{t("noActiveClasses")}</TableEmpty>
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

function SalaryCard({
  report,
  t,
  st,
  commonT,
}: {
  report: SalaryHistory;
  t: AnyT;
  st: AnyT;
  commonT: AnyT;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("salaryHistory")}</CardTitle>
        <CardDescription>{t("salaryTotalLabel", { total: num(report.total) })}</CardDescription>
      </CardHeader>
      <CardBody className="px-0">
        <Table>
          <THead>
            <TR>
              <TH>{t("user")}</TH>
              <TH>{commonT("month")}</TH>
              <TH>{commonT("amount")}</TH>
              <TH>{commonT("currency")}</TH>
              <TH>{commonT("status")}</TH>
            </TR>
          </THead>
          <TBody>
            {report.rows.length === 0 ? (
              <TableEmpty colSpan={5}>{t("noSalaryRecords")}</TableEmpty>
            ) : (
              report.rows.map((r) => (
                <TR key={r.id}>
                  <TD>{r.user_name ?? r.user_id}</TD>
                  <TD>{r.month}</TD>
                  <TD>{num(r.amount)}</TD>
                  <TD>{r.currency ?? "—"}</TD>
                  <TD>
                    <Badge variant={r.status === "paid" ? "success" : "neutral"}>
                      {r.status && st.has(r.status) ? st(r.status) : (r.status ?? "—")}
                    </Badge>
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
