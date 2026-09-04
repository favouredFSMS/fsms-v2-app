import { ResetForm } from "./reset-form";

export const metadata = { title: "Set new password — FSMS V2" };

export default function ResetPasswordPage() {
  return (
    <main style={{ maxWidth: 400, margin: "0 auto", padding: "4rem 1.5rem" }}>
      <h1 style={{ fontSize: "1.5rem", margin: "0 0 0.25rem" }}>Choose a new password</h1>
      <p style={{ color: "#64748b", margin: "0 0 1.75rem" }}>At least 8 characters.</p>
      <ResetForm />
    </main>
  );
}
