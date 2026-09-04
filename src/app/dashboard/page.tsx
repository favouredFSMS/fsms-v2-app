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

export const metadata = { title: "Dashboard — FSMS V2" };

export default async function DashboardPage() {
  const profile = await requireUser();

  const roleLabel = profile.role_key ?? profile.role_base;
  const sections = visibleNavSections(NAV_SECTIONS, (a) => profileCan(profile, a));

  const sample = [
    ["dashboard", profileCan(profile, "dashboard")],
    ["saveStudent", profileCan(profile, "saveStudent")],
    ["saveHomework", profileCan(profile, "saveHomework")],
    ["saveSalary", profileCan(profile, "saveSalary")],
    ["awardBadge", profileCan(profile, "awardBadge")],
  ] as const;

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
        <Card>
          <CardHeader>
            <CardTitle>
              Welcome, {profile.name ?? profile.email}
              <span className="ml-2 align-middle">
                <Badge variant="brand">{roleLabel}</Badge>
              </span>
            </CardTitle>
            <CardDescription>{profile.email}</CardDescription>
          </CardHeader>
          <CardBody>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              <Row k="User id" v={profile.id} />
              <Row k="School (tenant)" v={profile.school_id} />
              <Row
                k="Role"
                v={`${roleLabel} · rank ${profile.rank} · base ${profile.role_base}`}
              />
              <Row k="Status" v={profile.status} />
              <Row k="UI language (per-user)" v={profile.locale} />
              <Row k="Email language (per-user)" v={profile.notify_lang} />
            </dl>
          </CardBody>
        </Card>

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
                      {allowed ? (
                        <Badge variant="success">allowed</Badge>
                      ) : (
                        <Badge variant="danger">denied</Badge>
                      )}
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
