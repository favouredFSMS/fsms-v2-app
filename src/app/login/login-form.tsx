"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/auth/actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, null);

  return (
    <form action={formAction} style={formStyle}>
      <label style={labelStyle}>
        Email
        <input name="email" type="email" autoComplete="email" required style={inputStyle} />
      </label>
      <label style={labelStyle}>
        Password
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          style={inputStyle}
        />
      </label>

      {state?.error && <p style={errorStyle}>{state.error}</p>}

      <button type="submit" disabled={pending} style={buttonStyle}>
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <a href="/forgot-password" style={linkStyle}>
        Forgot password?
      </a>
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

const linkStyle: React.CSSProperties = { color: "#2563eb", fontSize: "0.9rem" };
