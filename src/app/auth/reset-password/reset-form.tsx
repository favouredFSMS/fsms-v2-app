"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "@/lib/auth/actions";

export function ResetForm() {
  const [state, formAction, pending] = useActionState(resetPasswordAction, null);

  if (state?.ok) {
    return (
      <p style={{ color: "#15803d", maxWidth: 360 }}>
        Password updated. <a href="/login">Sign in</a> with your new password.
      </p>
    );
  }

  return (
    <form action={formAction} style={formStyle}>
      <label style={labelStyle}>
        New password
        <input name="password" type="password" autoComplete="new-password" required style={inputStyle} />
      </label>
      <label style={labelStyle}>
        Confirm new password
        <input name="confirm" type="password" autoComplete="new-password" required style={inputStyle} />
      </label>
      {state?.error && <p style={errorStyle}>{state.error}</p>}
      <button type="submit" disabled={pending} style={buttonStyle}>
        {pending ? "Saving…" : "Set password"}
      </button>
    </form>
  );
}

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.9rem",
  maxWidth: 360,
};
const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.35rem",
  fontSize: "0.9rem",
  color: "#334155",
};
const inputStyle: React.CSSProperties = {
  padding: "0.55rem 0.7rem",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  fontSize: "1rem",
};
const buttonStyle: React.CSSProperties = {
  padding: "0.6rem 1rem",
  borderRadius: 8,
  border: "none",
  background: "#0f172a",
  color: "#fff",
  fontSize: "1rem",
  cursor: "pointer",
};
const errorStyle: React.CSSProperties = { color: "#dc2626", fontSize: "0.9rem", margin: 0 };
