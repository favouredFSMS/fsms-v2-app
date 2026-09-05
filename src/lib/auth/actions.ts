"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isLocalAuthEnabled, verifyLocalCredentials, issueLocalSession } from "@/lib/auth/local";
import { getAuthProfile } from "@/lib/auth/session";
import { translate } from "@/i18n/server";
import { LOCALE_COOKIE, normaliseLocale } from "@/i18n/locales";

/**
 * FSMS V2 — auth server actions (Phase 8).
 *
 * login/logout/recovery. Production uses Supabase GoTrue (O1 email recovery
 * primary); local dev uses the signed-cookie harness behind the same actions.
 */

export type AuthFormState = { error?: string; ok?: boolean } | null;

const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

/**
 * Resolve the dynamic application origin for auth redirects (password recovery, OAuth, magic links).
 *
 * Priority:
 * 1. Request headers (x-forwarded-host / host + x-forwarded-proto), which accurately
 *    detects the active Vercel domain, branch preview URL, or localhost.
 * 2. Fallback to `env.appUrl` (NEXT_PUBLIC_APP_URL, VERCEL_URL, or localhost).
 */
export async function getAuthRedirectBaseUrl(): Promise<string> {
  try {
    const headersList = await headers();
    const forwardedHost = headersList.get("x-forwarded-host");
    const host = forwardedHost ?? headersList.get("host");
    if (host) {
      const proto =
        headersList.get("x-forwarded-proto") ??
        (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
      return `${proto}://${host}`.replace(/\/+$/, "");
    }
  } catch {
    // Outside of request context
  }
  return env.appUrl;
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: await translate("auth.emailPasswordRequired") };
  }

  if (isLocalAuthEnabled()) {
    const id = await verifyLocalCredentials(email, password);
    if (!id) return { error: await translate("auth.invalidCredentials") };
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

  // Mirror the durable per-user UI language into the locale cookie so the
  // i18n request config resolves it without a DB round-trip on every request.
  const profile = await getAuthProfile();
  const locale = normaliseLocale(profile?.locale);
  (await cookies()).set(LOCALE_COOKIE, locale, {
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

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
  if (!email) return { error: await translate("auth.emailRequired") };

  if (isLocalAuthEnabled()) {
    return { error: await translate("auth.recoveryNeedsSupabase") };
  }

  const supabase = await createSupabaseServerClient();
  const baseUrl = await getAuthRedirectBaseUrl();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}/auth/callback?next=/auth/reset-password`,
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
  if (password.length < 8) return { error: await translate("auth.passwordMin") };
  if (password !== confirm) return { error: await translate("auth.passwordMismatch") };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return { ok: true };
}

/**
 * Google OAuth sign-in (F1.1, Phase 26). Supabase GoTrue issues the consent
 * URL; we then redirect the browser to Google. Local harness has no Google, so
 * it fails closed to the login page with a flag.
 */
export async function googleLoginAction(): Promise<void> {
  if (isLocalAuthEnabled()) {
    redirect("/login?error=google-unavailable");
  }
  const supabase = await createSupabaseServerClient();
  const baseUrl = await getAuthRedirectBaseUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${baseUrl}/auth/callback` },
  });
  if (error || !data?.url) {
    redirect("/login?error=google");
  }
  redirect(data.url);
}
