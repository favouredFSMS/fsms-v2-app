import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in — FSMS V2" };

export default function LoginPage() {
  return (
    <main style={{ maxWidth: 400, margin: "0 auto", padding: "4rem 1.5rem" }}>
      <h1 style={{ fontSize: "1.5rem", margin: "0 0 0.25rem" }}>FSMS V2</h1>
      <p style={{ color: "#64748b", margin: "0 0 1.75rem" }}>Sign in to continue.</p>
      <LoginForm />
    </main>
  );
}
