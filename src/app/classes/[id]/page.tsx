import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR, TableEmptyRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { requireDbContext, ClassRepository, StudentRepository, UserRepository } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { profileCan } from "@/lib/auth/authorize";
import { ClassAssignTeacherForm } from "@/components/academic/class-assign-teacher-form";
import { ClassEnrolStudentForm } from "@/components/academic/class-enrol-student-form";
import { EnrolmentStatusForm } from "@/components/academic/enrolment-status-form";
import { TeacherRemoveButton } from "@/components/academic/teacher-remove-button";

export const metadata = { title: "Class — FSMS" };

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default async function ClassDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [t, st, commonT, statesT] = await Promise.all([
    getTranslations("classDetail"),
    getTranslations("status"),
    getTranslations("common"),
    getTranslations("states"),
  ]);
  const profile = await requireUser();
  const { id } = await params;
  const ctx = await requireDbContext();

  const detail = await new ClassRepository(ctx).detail(id);
  if (!detail.ok || !detail.data) {
    return (
      <PageShell title={t("title")} permission="classes">
        <EmptyState
          icon="warning"
          title={statesT("notAvailable")}
          description={t("notAvailableDesc")}
        />
      </PageShell>
    );
  }

  const d = detail.data;
  const c = d.class;
  const canAssign = profileCan(profile, "saveTeacherAssignments");
  const canEnrol = profileCan(profile, "enrolStudent");

  const [teacherOpts, studentOpts] = (canAssign || canEnrol)
    ? await Promise.all([
        new UserRepository(ctx).search({ role: "teacher", pageSize: 100 }),
        new StudentRepository(ctx).search({ pageSize: 100 }),
      ])
    : [null, null];

  const teachers = teacherOpts?.ok
    ? teacherOpts.data.items.map((t) => ({ id: t.id, name: t.name }))
    : [];
  const students = studentOpts?.ok
    ? studentOpts.data.items.map((s) => ({ id: s.id, name: s.name }))
    : [];

  return (
    <PageShell title={c?.name ?? t("title")} permission="classes">
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>
              {c?.name}
              <span className="ml-2 align-middle">
                <Badge variant={c?.status === "active" ? "success" : "neutral"}>{st.has(c?.status ?? "") ? st(c?.status ?? "") : c?.status}</Badge>
              </span>
            </CardTitle>
            <CardDescription>
              {c?.class_type ?? t("group")} · {t("learner")} {c?.learner_type ?? "—"} · {t("room")} {c?.room ?? "—"}
            </CardDescription>
          </CardHeader>
          <CardBody>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              <Row k={t("level")} v={c?.level_code?.toUpperCase() ?? "—"} />
              <Row k={t("recurrence")} v={c?.recurrence ?? "—"} />
              <Row k={t("schedule")} v={c?.schedule ?? "—"} />
              <Row k={t("fee")} v={c?.fee != null ? `${c.fee} ${c.fee_currency ?? ""}` : "—"} />
              <Row
                k={t("dayTimes")}
                v={
                  d.day_times.length
                    ? d.day_times.map((dt) => `${DAYS[dt.day_of_week - 1] ?? dt.day_of_week} ${dt.start_time ?? ""}–${dt.end_time ?? ""}`).join(" · ")
                    : "—"
                }
              />
              <Row k={t("created")} v={c?.created_at?.slice(0, 10) ?? "—"} />
            </dl>
          </CardBody>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("teachers")}</CardTitle>
              <CardDescription>{t("teachersDesc")}</CardDescription>
            </CardHeader>
            <CardBody className="px-0">
              <Table>
                <TBody>
                  {d.teachers.map((tch) => (
                    <TR key={tch.id}>
                      <TD className="font-medium">{tch.name}</TD>
                      <TD>{tch.is_primary ? t("primary") : t("assistant")}</TD>
                      <TD className="text-right">
                        {canAssign && <TeacherRemoveButton classId={id} userId={tch.id} />}
                      </TD>
                    </TR>
                  ))}
                  {d.teachers.length === 0 && <TableEmptyRow colSpan={3}>{t("noTeachersAssigned")}</TableEmptyRow>}
                </TBody>
              </Table>
            </CardBody>
            {canAssign && (
              <CardBody className="border-t border-line">
                <ClassAssignTeacherForm classId={id} teachers={teachers} />
              </CardBody>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("students")}</CardTitle>
              <CardDescription>{t("studentsDesc")}</CardDescription>
            </CardHeader>
            <CardBody className="px-0">
              <Table>
                <THead>
                  <TR>
                    <TH>{commonT("name")}</TH>
                    <TH>{t("studentNo")}</TH>
                    <TH className="text-right">{commonT("status")}</TH>
                  </TR>
                </THead>
                <TBody>
                  {d.students.map((s) => (
                    <TR key={s.id}>
                      <TD className="font-medium">{s.name}</TD>
                      <TD className="font-mono text-xs text-ink-faint">{s.student_no}</TD>
                      <TD className="text-right">
                        {canEnrol ? (
                          <div className="flex justify-end">
                            <EnrolmentStatusForm enrolmentId={s.enrolment_id} status={s.status} />
                          </div>
                        ) : (
                          <Badge variant={s.status === "active" ? "success" : "neutral"}>{s.status && st.has(s.status) ? st(s.status) : s.status}</Badge>
                        )}
                      </TD>
                    </TR>
                  ))}
                  {d.students.length === 0 && <TableEmptyRow colSpan={3}>{t("noStudentsEnrolled")}</TableEmptyRow>}
                </TBody>
              </Table>
            </CardBody>
            {canEnrol && (
              <CardBody className="border-t border-line">
                <ClassEnrolStudentForm classId={id} students={students} />
              </CardBody>
            )}
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex min-w-0 gap-3 py-0.5">
      <dt className="w-32 shrink-0 text-sm text-ink-muted">{k}</dt>
      <dd className="min-w-0 break-words text-sm text-ink">{v}</dd>
    </div>
  );
}
