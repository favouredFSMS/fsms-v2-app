import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardBody, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TR, TableEmpty } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/states";
import { requireDbContext, StudentRepository, ParentRepository } from "@/lib/db";
import { requireUser } from "@/lib/auth/guards";
import { profileCan } from "@/lib/auth/authorize";
import { LinkParentForm } from "@/components/people/link-parent-form";

export const metadata = { title: "Student — FSMS V2" };

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const profile = await requireUser();
  const { id } = await params;
  const ctx = await requireDbContext();

  const detail = await new StudentRepository(ctx).detail(id);

  if (!detail.ok || !detail.data) {
    return (
      <PageShell title="Student" permission="students">
        <EmptyState
          icon="warning"
          title="Not available"
          description="This student does not exist or is not visible to your account."
        />
      </PageShell>
    );
  }

  const d = detail.data;
  const s = d.student;
  const canLinkParent = profileCan(profile, "saveParent");
  const parents = canLinkParent
    ? await new ParentRepository(ctx).search({ pageSize: 100 })
    : null;

  const stats: Array<[string, number]> = [
    ["Present", d.summary.attendance_present],
    ["Late", d.summary.attendance_late],
    ["Absent", d.summary.attendance_absent],
    ["Homework", d.summary.homework_total],
    ["Graded", d.summary.homework_graded],
    ["Assessments", d.summary.assessments],
    ["Evidence", d.summary.evidence],
  ];

  return (
    <PageShell title={s?.name ?? "Student"} permission="students">
      <div className="grid gap-4">
        <Card>
          <CardHeader>
            <CardTitle>
              {s?.name}
              <span className="ml-2 align-middle">
                <Badge variant={s?.status === "active" ? "success" : "neutral"}>{s?.status}</Badge>
              </span>
            </CardTitle>
            <CardDescription>
              {s?.student_no} · level {s?.level_code?.toUpperCase() ?? "—"} · legacy {s?.legacy_id ?? "—"}
            </CardDescription>
          </CardHeader>
          <CardBody>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              <Row k="Date of birth" v={s?.dob ?? "—"} />
              <Row k="Gender" v={s?.gender ?? "—"} />
              <Row k="Learner type" v={s?.learner_type ?? "—"} />
              <Row k="Joined" v={s?.joined_at?.slice(0, 10) ?? "—"} />
              <Row k="Phone" v={s?.phone ?? "—"} />
              <Row k="Email" v={s?.email ?? "—"} />
              <Row k="Address" v={s?.address ?? "—"} />
              <Row k="Notes" v={s?.notes ?? "—"} />
            </dl>
          </CardBody>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Classes</CardTitle>
              <CardDescription>Enrolments.</CardDescription>
            </CardHeader>
            <CardBody className="px-0">
              <Table>
                <TBody>
                  {d.classes.map((c) => (
                    <TR key={c.id}>
                      <TD className="font-medium">{c.name}</TD>
                      <TD>{c.level_code?.toUpperCase()}</TD>
                      <TD className="text-right text-xs text-ink-faint">{c.primary_teacher}</TD>
                    </TR>
                  ))}
                  {d.classes.length === 0 && <TableEmpty colSpan={3}>Not enrolled yet.</TableEmpty>}
                </TBody>
              </Table>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Parents</CardTitle>
              <CardDescription>Linked guardians.</CardDescription>
            </CardHeader>
            <CardBody className="px-0">
              <Table>
                <TBody>
                  {d.parents.map((p) => (
                    <TR key={p.id}>
                      <TD className="font-medium">{p.name}</TD>
                      <TD className="text-xs text-ink-faint">{p.relationship}</TD>
                      <TD className="text-right text-xs text-ink-faint">
                        {p.phone ?? p.email ?? ""}
                      </TD>
                    </TR>
                  ))}
                  {d.parents.length === 0 && <TableEmpty colSpan={3}>No parents linked.</TableEmpty>}
                </TBody>
              </Table>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              <CardDescription>Attendance · homework · assessments.</CardDescription>
            </CardHeader>
            <CardBody className="px-0">
              <Table>
                <TBody>
                  {stats.map(([k, v]) => (
                    <TR key={k}>
                      <TD>{k}</TD>
                      <TD className="text-right tabular-nums">{v}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </CardBody>
          </Card>
        </div>

        {canLinkParent && parents?.ok && (
          <Card>
            <CardHeader>
              <CardTitle>Link a parent</CardTitle>
              <CardDescription>Office action — attaches a guardian to this student.</CardDescription>
            </CardHeader>
            <CardBody>
              <LinkParentForm
                studentId={id}
                parents={parents.data.items.map((p) => ({ id: p.id, name: p.name }))}
              />
            </CardBody>
          </Card>
        )}
      </div>
    </PageShell>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex min-w-0 gap-3 py-0.5">
      <dt className="w-36 shrink-0 text-sm text-ink-muted">{k}</dt>
      <dd className="min-w-0 break-words text-sm text-ink">{v}</dd>
    </div>
  );
}
