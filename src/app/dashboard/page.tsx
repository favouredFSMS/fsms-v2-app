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

export const metadata = { title: "Dashboard — FSMS V2" };

// Always render on demand: the dashboard reads the session + per-user summary.
export const dynamic = "force-dynamic";

/** Map homework/attendance-ish status strings to a badge tone. */
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
  const profile = await requireUser();

  // Phase 11: role-specific dashboard from ONE RPC round trip (no N+1).
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

  return (
    <AppShell
      brand="FSMS V2"
      title="Dashboard"
      user={{
        name: profile.name ?? profile.email ?? "FSMS user",
        email: profile.email ?? "",
        roleLabel,
      }}
      sections={sections}
    >
      <div className="grid gap-4">
        {/* welcome / identity */}
        <Card>
          <CardHeader>
            <CardTitle>
              Welcome, {profile.name ?? profile.email}
              <span className="ml-2 align-middle">
                <Badge variant="brand">{roleLabel}</Badge>
              </span>
            </CardTitle>
            <CardDescription>
              {s?.school?.name} · {profile.email}
            </CardDescription>
          </CardHeader>
          <CardBody>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              <Row k="School (tenant)" v={profile.school_id} />
              <Row
                k="Role"
                v={`${roleLabel} · rank ${profile.rank} · base ${profile.role_base}`}
              />
              <Row k="Status" v={profile.status} />
              <Row k="UI language (per-user)" v={profile.locale} />
            </dl>
          </CardBody>
        </Card>

        {/* staff: counts + today's attendance */}
        {s?.counts && (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {(
              [
                ["Students", s.counts.students],
                ["Teachers", s.counts.teachers],
                ["Parents", s.counts.parents],
                ["Classes", s.counts.classes],
              ] as const
            ).map(([label, value]) => (
              <Card key={label}>
                <CardBody className="py-4">
                  <p className="text-2xl font-semibold tabular-nums">{value}</p>
                  <p className="text-sm text-ink-muted">{label}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {/* teacher: my classes + grading queue */}
        {profile.role_base === "teacher" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>My classes</CardTitle>
                <CardDescription>Assigned to you this academic year.</CardDescription>
              </CardHeader>
              <CardBody className="px-0">
                <Table>
                  <TBody>
                    {s?.myClasses.map((c) => (
                      <TR key={c.id}>
                        <TD className="font-medium">{c.name}</TD>
                        <TD>{c.level_code?.toUpperCase()}</TD>
                        <TD className="text-right tabular-nums">{c.students} students</TD>
                      </TR>
                    ))}
                    {!s?.myClasses.length && <TR><TD className="text-ink-faint">No classes assigned yet.</TD></TR>}
                  </TBody>
                </Table>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Grading queue</CardTitle>
                <CardDescription>
                  {s?.gradingQueue?.to_grade ?? 0} submitted homework item(s) awaiting feedback.
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
                          <Badge variant={statusVariant(h.status)}>{h.status}</Badge>
                        </TD>
                      </TR>
                    ))}
                    {!s?.gradingQueue?.recent.length && (
                      <TR><TD className="text-ink-faint">All caught up 🎉</TD></TR>
                    )}
                  </TBody>
                </Table>
              </CardBody>
            </Card>
          </div>
        )}

        {/* parent: my children + their homework */}
        {profile.role_base === "parent" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>My children</CardTitle>
                <CardDescription>Linked students in this school.</CardDescription>
              </CardHeader>
              <CardBody className="px-0">
                <Table>
                  <TBody>
                    {s?.myChildren.map((c) => (
                      <TR key={c.id}>
                        <TD className="font-medium">{c.name}</TD>
                        <TD className="font-mono text-xs text-ink-faint">{c.student_no}</TD>
                        <TD>{c.level_code?.toUpperCase()}</TD>
                      </TR>
                    ))}
                    {!s?.myChildren.length && (
                      <TR><TD className="text-ink-faint">No children linked.</TD></TR>
                    )}
                  </TBody>
                </Table>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Recent homework</CardTitle>
                <CardDescription>Latest items across your children.</CardDescription>
              </CardHeader>
              <CardBody className="px-0">
                <Table>
                  <TBody>
                    {s?.childHomework.map((h) => (
                      <TR key={h.id}>
                        <TD className="font-medium">{h.title}</TD>
                        <TD>{h.student}</TD>
                        <TD className="text-right">
                          <Badge variant={statusVariant(h.status)}>{h.status}</Badge>
                        </TD>
                      </TR>
                    ))}
                    {!s?.childHomework.length && (
                      <TR><TD className="text-ink-faint">No homework yet.</TD></TR>
                    )}
                  </TBody>
                </Table>
              </CardBody>
            </Card>
          </div>
        )}

        {/* student: my homework + assessments + progress */}
        {profile.role_base === "student" && (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>My homework</CardTitle>
                <CardDescription>Upcoming and recent items.</CardDescription>
              </CardHeader>
              <CardBody className="px-0">
                <Table>
                  <TBody>
                    {s?.myHomework.map((h) => (
                      <TR key={h.id}>
                        <TD className="font-medium">{h.title}</TD>
                        <TD className="text-right">
                          <Badge variant={statusVariant(h.status)}>{h.status}</Badge>
                        </TD>
                      </TR>
                    ))}
                    {!s?.myHomework.length && (
                      <TR><TD className="text-ink-faint">No homework assigned.</TD></TR>
                    )}
                  </TBody>
                </Table>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Assessments</CardTitle>
                <CardDescription>Latest results.</CardDescription>
              </CardHeader>
              <CardBody className="px-0">
                <Table>
                  <TBody>
                    {s?.myAssessments.map((a) => (
                      <TR key={a.id}>
                        <TD className="font-medium">{a.title}</TD>
                        <TD className="text-right tabular-nums">
                          {a.score} / {a.max_score}
                        </TD>
                      </TR>
                    ))}
                    {!s?.myAssessments.length && (
                      <TR><TD className="text-ink-faint">No assessments yet.</TD></TR>
                    )}
                  </TBody>
                </Table>
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Progress</CardTitle>
                <CardDescription>Your learning so far.</CardDescription>
              </CardHeader>
              <CardBody>
                <dl className="grid grid-cols-2 gap-4">
                  <Stat k="Lessons achieved" v={s?.myProgress?.lessons_achieved} />
                  <Stat k="Evidence items" v={s?.myProgress?.evidence} />
                </dl>
              </CardBody>
            </Card>
          </div>
        )}

        {/* staff: live student list (Phase 10 DAL demo) */}
        {isStaff(profile.role_base) && (
          <StaffStudentsCard schoolId={profile.school_id} />
        )}

        {/* authorization sample */}
        <Card>
          <CardHeader>
            <CardTitle>Authorization</CardTitle>
            <CardDescription>
              {profile.permissions.length} permissions resolved server-side
              {profile.role_base === "admin1" ? " · owner wildcard" : ""} — the
              database (RLS + fsms.has_perm) remains authoritative.
            </CardDescription>
          </CardHeader>
          <CardBody className="px-0">
            <Table>
              <TBody>
                {sample.map(([action, allowed]) => (
                  <TR key={action}>
                    <TD className="font-mono text-xs">{action}</TD>
                    <TD className="text-right">
                      {allowed ? <Badge variant="success">allowed</Badge> : <Badge variant="danger">denied</Badge>}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <p className="px-5 pt-3 text-xs text-ink-faint">
              Group flags: staff={String(isStaff(profile.role_base))} · finance=
              {String(isFinance(profile.role_base))} · leadership=
              {String(isLeadership(profile.role_base))}
            </p>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex min-w-0 gap-3 py-0.5">
      <dt className="w-44 shrink-0 text-sm text-ink-muted">{k}</dt>
      <dd className="min-w-0 font-mono text-xs break-all text-ink">{v}</dd>
    </div>
  );
}

function Stat({ k, v }: { k: string; v: number | undefined }) {
  return (
    <div>
      <p className="text-2xl font-semibold tabular-nums">{v ?? 0}</p>
      <p className="text-sm text-ink-muted">{k}</p>
    </div>
  );
}
