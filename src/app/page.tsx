import { SCHOOL_TIMEZONE, schoolDateTime } from "@/lib/clock";

export default function Home() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2.5rem", maxWidth: 720 }}>
      <h1 style={{ fontSize: "2rem", margin: "0 0 0.25rem" }}>FSMS V2</h1>
      <p style={{ color: "#475569", margin: "0 0 1.5rem" }}>
        FAVOURED Student Management System — development environment (Phase 5).
      </p>

      <section style={card}>
        <h2 style={h2}>Environment</h2>
        <ul style={{ margin: 0, paddingLeft: "1.25rem", lineHeight: 1.7 }}>
          <li>Next.js + React + TypeScript — App Router</li>
          <li>Supabase client (server + browser factories)</li>
          <li>Email provider abstraction (Resend — O5)</li>
          <li>Translation provider abstraction (O3)</li>
          <li>School timezone: {SCHOOL_TIMEZONE}</li>
          <li>School time now: {schoolDateTime()}</li>
        </ul>
      </section>

      <section style={card}>
        <h2 style={h2}>Next steps</h2>
        <p style={{ margin: 0, lineHeight: 1.7 }}>
          Phase 5 exit criterion: a clean V2 application runs locally. From here the
          roadmap proceeds to Phase 6 (Database Foundation) — schema, migrations and
          seed data — per <code>FSMS_V2_DATABASE.md</code>.
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
