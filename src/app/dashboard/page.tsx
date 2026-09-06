import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { profileCan } from "@/lib/auth/authorize";
import { isStaff, isFinance, isLeadership } from "@/lib/auth/roles";
import { AppShell } from "@/components/layout/app-shell";
import { NAV_SECTIONS, visibleNavSections } from "@/components/layout/nav";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardBody,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Table, TBody, TD, TR } from "@/components/ui/table";
import { requireDbContext, DashboardRepository } from "@/lib/db";
import { StaffStudentsCard } from "@/components/dashboard/staff-students-card";
import { KpiMetricsRow } from "@/components/dashboard/kpi-metrics-row";
import { TodaysClassesCard } from "@/components/dashboard/todays-classes-card";
import { QuickEntryCard } from "@/components/dashboard/quick-entry-card";
import { QuickPrepCard } from "@/components/dashboard/quick-prep-card";
import { LessonCalendarCard } from "@/components/dashboard/lesson-calendar-card";
import { ActivityFeedCard } from "@/components/dashboard/activity-feed-card";
import { StaffRemarksCard } from "@/components/dashboard/staff-remarks-card";
import { StudentRosterCard } from "@/components/dashboard/student-roster-card";
import { MonthlySpotlightCard } from "@/components/dashboard/monthly-spotlight-card";
import { FamilyDashboardView } from "@/components/dashboard/family-dashboard-view";

export const metadata = { title: "Dashboard — Favoured School Management System" };

export const dynamic = "force-dynamic";

function statusVariant(status: string | null | undefined) {
  switch (status) {
    case "graded":
    case "present":
    case "active":
    case "achieved":
    case "mastered":
      return "success" as const;
    case "overdue":
    case "absent":
    case "missing":
    case "blocked":
      return "danger" as const;
    case "submitted":
    case "late":
    case "almost":
      return "warning" as const;
    case "assigned":
    case "scheduled":
      return "info" as const;
    default:
      return "neutral" as const;
  }
}

export default async function DashboardPage() {
  const [t, st] = await Promise.all([getTranslations("dashboard"), getTranslations("status")]);
  const profile = await requireUser();

  const ctx = await requireDbContext();
  const summary = await new DashboardRepository(ctx).summary();

  const roleLabel = profile.role_key ?? profile.role_base;
  const sections = visibleNavSections(NAV_SECTIONS, (a) => profileCan(profile, a));

  const sample = [
    ["dashboard", profileCan(profile, "dashboard")],
    ["saveStudent", profileCan(profile, "saveStudent")],
    ["saveHomework", profileCan(profile, "saveHomework")],
    ["saveSalary", profileCan(profile, "saveSalary")],
    ["awardBadge", profileCan(profile, "awardBadge")],
  ] as const;

  const s = summary.ok ? summary.data : null;
  const isStaffUser = isStaff(profile.role_base);

  return (
    <AppShell
      brand="FSMS"
      title={t("welcome", { name: profile.name ?? profile.email ?? "" })}
      subtitle={`${s?.school?.name ?? "Favoured School Management System"} · ${profile.email}`}
      user={{
        name: profile.name ?? profile.email ?? "FSMS user",
        email: profile.email ?? "",
        roleLabel,
      }}
      sections={sections}
    >
      <div className="space-y-6">
        {/* V99 5-KPI Delta Metric Cards (Staff / Leadership / Teachers) */}
        {isStaffUser && s?.stats && (
          <KpiMetricsRow stats={s.stats} />
        )}

        {/* V99 3-Column Operational Command Center (Staff / Leadership / Teachers) */}
        {isStaffUser && (
          <div className="dash">
            {/* Column 1: Operational Flow */}
            <div className="dash-col">
              <TodaysClassesCard classes={s?.todaysClasses ?? []} />
              <QuickEntryCard />
              <QuickPrepCard />
            </div>

            {/* Column 2: Calendar, Activity & Remarks */}
            <div className="dash-col">
              <LessonCalendarCard />
              <ActivityFeedCard activities={s?.activities ?? []} />
              <StaffRemarksCard remarks={s?.remarks ?? []} />
            </div>

            {/* Column 3: Roster & Spotlight Recognition */}
            <div className="dash-col">
              <StudentRosterCard roster={s?.roster ?? []} />
              <MonthlySpotlightCard spotlight={s?.spotlight ?? []} />
            </div>
          </div>
        )}

        {/* Teacher Assigned Classes & Grading Queue */}
        {profile.role_base === "teacher" && (
          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("myClasses")}</CardTitle>
                <CardDescription>{t("myClassesDesc")}</CardDescription>
              </CardHeader>
              <CardBody className="px-0">
                <Table>
                  <TBody>
                    {s?.myClasses.map((c) => (
                      <TR key={c.id}>
                        <TD className="font-medium">{c.name}</TD>
                        <TD>{c.level_code?.toUpperCase()}</TD>
                        <TD className="text-right tabular-nums">{t("xStudents", { count: c.students })}</TD>
                      </TR>
                    ))}
                    {!s?.myClasses.length && <TR><TD className="text-ink-faint">{t("noClassesAssigned")}</TD></TR>}
                  </TBody>
                </Table>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("gradingQueue")}</CardTitle>
                <CardDescription>
                  {t("gradingQueueDesc", { count: s?.gradingQueue?.to_grade ?? 0 })}
                </CardDescription>
              </CardHeader>
              <CardBody className="px-0">
                <Table>
                  <TBody>
                    {s?.gradingQueue?.recent.map((h) => (
                      <TR key={h.id}>
                        <TD className="font-medium">{h.title}</TD>
                        <TD>{h.student}</TD>
                        <TD className="text-right">
                          <Badge variant={statusVariant(h.status)}>{h.status && st.has(h.status) ? st(h.status) : h.status}</Badge>
                        </TD>
                      </TR>
                    ))}
                    {!s?.gradingQueue?.recent.length && (
                      <TR><TD className="text-ink-faint">{t("allCaughtUp")}</TD></TR>
                    )}
                  </TBody>
                </Table>
              </CardBody>
            </Card>
          </div>
        )}

        {/* Parent & Student Family Dashboard View */}
        {!isStaffUser && s && (
          <FamilyDashboardView summary={s} roleBase={profile.role_base} />
        )}

        {/* Staff Student Direct Search & Table View */}
        {isStaffUser && (
          <StaffStudentsCard schoolId={profile.school_id} />
        )}

        {/* Authorization & Tenant Verification Box */}
        <Card>
          <CardHeader>
            <CardTitle>{t("authorization")}</CardTitle>
            <CardDescription>
              {t("authorizationDesc", {
                count: profile.permissions.length,
                owner: profile.role_base === "admin1" ? t("ownerWildcard") : "",
              })}
            </CardDescription>
          </CardHeader>
          <CardBody className="px-0">
            <Table>
              <TBody>
                {sample.map(([action, allowed]) => (
                  <TR key={action}>
                    <TD className="font-mono text-xs">{action}</TD>
                    <TD className="text-right">
                      {allowed ? <Badge variant="success">{t("allowed")}</Badge> : <Badge variant="danger">{t("denied")}</Badge>}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <p className="px-5 pt-3 text-xs text-ink-faint">
              {t("groupFlags", {
                staff: String(isStaff(profile.role_base)),
                finance: String(isFinance(profile.role_base)),
                leadership: String(isLeadership(profile.role_base)),
              })}
            </p>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
