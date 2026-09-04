import { ForgotForm } from "./forgot-form";

export const metadata = { title: "Forgot password — FSMS V2" };

export default function ForgotPasswordPage() {
  return (
    <main style={{ maxWidth: 400, margin: "0 auto", padding: "4rem 1.5rem" }}>
      <h1 style={{ fontSize: "1.5rem", margin: "0 0 0.25rem" }}>Reset your password</h1>
      <p style={{ color: "#64748b", margin: "0 0 1.75rem" }}>
        We&apos;ll email you a secure recovery link.
      </p>
      <ForgotForm />
    </main>
  );
}
