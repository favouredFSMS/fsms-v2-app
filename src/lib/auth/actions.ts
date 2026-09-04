"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isLocalAuthEnabled, verifyLocalCredentials, issueLocalSession } from "@/lib/auth/local";

/**
 * FSMS V2 — auth server actions (Phase 8).
 *
 * login/logout/recovery. Production uses Supabase GoTrue (O1 email recovery
 * primary); local dev uses the signed-cookie harness behind the same actions.
 */

export type AuthFormState = { error?: string; ok?: boolean } | null;

const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  if (isLocalAuthEnabled()) {
    const id = await verifyLocalCredentials(email, password);
    if (!id) return { error: "Invalid email or password." };
    const store = await cookies();
    store.set("fsms_local_session", issueLocalSession(id, email), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_MAX_AGE,
      path: "/",
    });
  } else {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { error: error.message };
    }
  }

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  if (isLocalAuthEnabled()) {
    const store = await cookies();
    store.delete("fsms_local_session");
  } else {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  redirect("/login");
}

/** O1: password recovery — Supabase email is the primary path. */
export async function forgotPasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Email is required." };

  if (isLocalAuthEnabled()) {
    return {
      error:
        "Password recovery needs a provisioned Supabase project (O1: email recovery). In local dev, use the seeded demo passwords.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.appUrl}/auth/reset-password`,
  });
  if (error) return { error: error.message };
  // Generic response — never reveal whether the account exists.
  return { ok: true };
}

export async function resetPasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return { ok: true };
}
