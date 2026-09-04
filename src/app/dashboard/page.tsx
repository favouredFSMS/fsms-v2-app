import { requireUser } from "@/lib/auth/guards";
import { logoutAction } from "@/lib/auth/actions";
import { profileCan } from "@/lib/auth/authorize";
import { isStaff, isFinance, isLeadership } from "@/lib/auth/roles";

export const metadata = { title: "Dashboard — FSMS V2" };

export default async function DashboardPage() {
  const profile = await requireUser();

  const sample = [
    ["dashboard", profileCan(profile, "dashboard")],
    ["saveStudent", profileCan(profile, "saveStudent")],
    ["saveHomework", profileCan(profile, "saveHomework")],
    ["saveSalary", profileCan(profile, "saveSalary")],
    ["awardBadge", profileCan(profile, "awardBadge")],
  ] as const;

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "3rem 1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ margin: 0 }}>Welcome, {profile.name ?? profile.email}</h1>
          <p style={{ color: "#64748b", margin: "0.25rem 0 0" }}>{profile.email}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" style={btn}>Sign out</button>
        </form>
      </div>

      <section style={card}>
        <h2 style={h2}>Session &amp; identity</h2>
        <dl style={dl}>
          <Row k="User id" v={profile.id} />
          <Row k="School (tenant)" v={profile.school_id} />
          <Row k="Role" v={`${profile.role_key ?? profile.role_base} (base: ${profile.role_base}, rank ${profile.rank})`} />
          <Row k="Status" v={profile.status} />
          <Row k="UI language (per-user)" v={profile.locale} />
          <Row k="Email language (per-user)" v={profile.notify_lang} />
        </dl>
      </section>

      <section style={card}>
        <h2 style={h2}>Authorization (resolved server-side)</h2>
        <p style={{ margin: "0 0 0.5rem", color: "#475569" }}>
          {profile.permissions.length} permissions {profile.role_base === "admin1" ? "(owner wildcard)" : ""}
        </p>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <tbody>
            {sample.map(([action, allowed]) => (
              <tr key={action} style={{ borderBottom: "1px solid #e2e8f0" }}>
                <td style={{ padding: "0.35rem 0", fontFamily: "monospace", fontSize: "0.9rem" }}>{action}</td>
                <td style={{ padding: "0.35rem 0", textAlign: "right" }}>
                  {allowed ? <span style={{ color: "#15803d" }}>allowed</span> : <span style={{ color: "#b91c1c" }}>denied</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ color: "#64748b", fontSize: "0.85rem", marginTop: "0.75rem" }}>
          Coarse group flags: staff={String(isStaff(profile.role_base))} · finance=
          {String(isFinance(profile.role_base))} · leadership={String(isLeadership(profile.role_base))}
        </p>
      </section>

      <p style={{ color: "#94a3b8", fontSize: "0.8rem" }}>
        Phase 8 — Authentication &amp; Authorization. Authoritative enforcement lives in the
        database (RLS + <code>fsms.has_perm</code>); this page only reflects it.
      </p>
    </main>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: "flex", gap: "0.75rem", padding: "0.3rem 0" }}>
      <dt style={{ color: "#64748b", width: 180, flexShrink: 0 }}>{k}</dt>
      <dd style={{ margin: 0, fontFamily: "monospace", fontSize: "0.85rem", wordBreak: "break-all" }}>{v}</dd>
    </div>
  );
}

const card: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: "1rem 1.25rem",
  marginBottom: "1rem",
};
const h2: React.CSSProperties = { fontSize: "1.05rem", margin: "0 0 0.75rem" };
const dl: React.CSSProperties = { margin: 0 };
const btn: React.CSSProperties = {
  padding: "0.5rem 0.9rem",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  background: "#fff",
  cursor: "pointer",
  fontSize: "0.9rem",
};
