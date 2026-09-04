import { SCHOOL_TIMEZONE, schoolDateTime } from "@/lib/clock";

export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2.5rem", maxWidth: 720, margin: "0 auto" }}>
      <h1 style={{ fontSize: "2rem", margin: "0 0 0.25rem" }}>FSMS V2</h1>
      <p style={{ color: "#475569", margin: "0 0 1.5rem" }}>
        FAVOURED Student Management System — V2 (Next.js + Supabase).
      </p>

      <section style={card}>
        <h2 style={h2}>Authentication (Phase 8)</h2>
        <ul style={{ margin: 0, paddingLeft: "1.25rem", lineHeight: 1.7 }}>
          <li>
            <a href="/login" style={{ color: "#2563eb" }}>
              Sign in
            </a>{" "}
            — login, logout, password recovery
          </li>
          <li>
            <a href="/dashboard" style={{ color: "#2563eb" }}>
              Dashboard
            </a>{" "}
            — protected: resolves your role, school, permissions server-side
          </li>
          <li>School timezone: {SCHOOL_TIMEZONE} · now: {schoolDateTime()}</li>
        </ul>
      </section>

      <section style={card}>
        <h2 style={h2}>Note</h2>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          Local development uses the dev auth harness (seeded demo accounts). Production
          authentication is Supabase Auth — configured entirely via environment variables,
          never committed.
        </p>
      </section>
    </main>
  );
}

const card: React.CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: "1rem 1.25rem",
  marginBottom: "1rem",
};
const h2: React.CSSProperties = { fontSize: "1.1rem", margin: "0 0 0.5rem" };
