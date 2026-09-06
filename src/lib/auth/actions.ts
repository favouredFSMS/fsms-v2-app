"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isLocalAuthEnabled, verifyLocalCredentials, issueLocalSession } from "@/lib/auth/local";
import { getAuthProfile } from "@/lib/auth/session";
import type { AuthProfile, RoleKey } from "@/lib/auth/types";
import { translate } from "@/i18n/server";
import { LOCALE_COOKIE, normaliseLocale } from "@/i18n/locales";

/**
 * FSMS V2 — auth server actions (Phase 8 & Phase 36).
 *
 * login/signup/logout/recovery. Production uses Supabase GoTrue (O1 email recovery
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

/**
 * Sanitize error messages returned from GoTrue or low-level network failures.
 */
function sanitizeAuthError(err: unknown, defaultMessage = "Authentication failed. Please try again."): string {
  if (!err) return defaultMessage;
  const msg = typeof err === "string" ? err : (err as { message?: string }).message ?? "";
  const lower = msg.toLowerCase();
  if (
    lower.includes("fetch failed") ||
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("econnrefused")
  ) {
    return "Unable to connect to the authentication server. Please check your network connection or verify that NEXT_PUBLIC_SUPABASE_URL is properly configured.";
  }
  if (lower.includes("invalid login credentials") || lower.includes("invalid credentials")) {
    return "Invalid email or password.";
  }
  if (
    lower.includes("user already registered") ||
    lower.includes("already registered") ||
    lower.includes("email address already in use")
  ) {
    return "An account with this email address already exists. Please sign in instead.";
  }
  return msg || defaultMessage;
}

export async function loginAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: await translate("auth.emailPasswordRequired") };
  }

  let profile: AuthProfile | null = null;

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
    profile = await getAuthProfile();
  } else {
    if (!env.supabaseUrl || !env.supabaseAnonKey) {
      return { error: "Authentication service is not configured. Missing Supabase environment variables." };
    }

    try {
      const supabase = await createSupabaseServerClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        return { error: sanitizeAuthError(signInError) };
      }
      // Pass the active client that just authenticated to ensure immediate session availability
      profile = await getAuthProfile(supabase);
    } catch (err: unknown) {
      return { error: sanitizeAuthError(err) };
    }
  }

  if (!profile) {
    return { error: "Authentication succeeded but profile could not be loaded. Please try again." };
  }

  if (profile.status !== "active") {
    if (!isLocalAuthEnabled()) {
      try {
        const supabase = await createSupabaseServerClient();
        await supabase.auth.signOut().catch(() => {});
      } catch {}
    }
    return { error: "Your account is not active. Please contact an administrator." };
  }

  // Mirror the durable per-user UI language into the locale cookie so the
  // i18n request config resolves it without a DB round-trip on every request.
  const locale = normaliseLocale(profile.locale);
  (await cookies()).set(LOCALE_COOKIE, locale, {
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });

  redirect("/dashboard");
}

export async function signupAction(_prev: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const phone = String(formData.get("phone") ?? "").trim();
  const country = String(formData.get("country") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const requestedRole = String(formData.get("role") ?? "parent").toLowerCase() as RoleKey;
  const note = String(formData.get("note") ?? "").trim();

  const validRoles: RoleKey[] = ["parent", "student", "teacher"];
  const roleKey: RoleKey = validRoles.includes(requestedRole) ? requestedRole : "parent";

  if (!name) {
    return { error: await translate("auth.fullNameRequired") };
  }
  if (!email) {
    return { error: await translate("auth.emailRequired") };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Please enter a valid email address." };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }
  if (password !== confirm) {
    return { error: await translate("auth.passwordMismatch") };
  }

  if (isLocalAuthEnabled()) {
    return { ok: true };
  }

  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    return { error: "Authentication service is not configured. Missing Supabase environment variables." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const baseUrl = await getAuthRedirectBaseUrl();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: roleKey,
          phone: phone || null,
          country: country || null,
          city: city || null,
          signup_note: note || null,
        },
        emailRedirectTo: `${baseUrl}/auth/callback?next=/dashboard`,
      },
    });

    if (signUpError) {
      return { error: sanitizeAuthError(signUpError) };
    }

    const newUser = data?.user;
    if (!newUser) {
      return { error: "Registration failed to create user. Please try again." };
    }

    // Auto-provision or update profile record in database using admin client if service role key is configured
    if (env.supabaseServiceRoleKey) {
      try {
        const { getServerClient } = await import("@/lib/supabase/server");
        const adminClient = getServerClient();
        const { data: school } = await adminClient
          .from("schools")
          .select("id")
          .order("created_at")
          .limit(1)
          .maybeSingle();
        const schoolId = school?.id ?? "00000000-0000-0000-0000-000000000001";

        const { data: roleRow } = await adminClient
          .from("roles")
          .select("id")
          .eq("school_id", schoolId)
          .eq("key", roleKey)
          .maybeSingle();

        await adminClient.from("profiles").upsert({
          id: newUser.id,
          school_id: schoolId,
          email: newUser.email ?? email,
          name,
          phone: phone || null,
          country: country || null,
          city: city || null,
          role_base: roleKey,
          role_id: roleRow?.id ?? null,
          requested_role: roleKey,
          signup_note: note || null,
          status: "active",
          locale: "en",
          notify_lang: "en",
        });
      } catch (profileErr) {
        console.error("Profile creation during sign-up error:", profileErr);
      }
    }

    // If session is present immediately (e.g. email confirmation disabled), log in directly
    if (data.session) {
      const locale = "en";
      (await cookies()).set(LOCALE_COOKIE, locale, {
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: SESSION_MAX_AGE,
        path: "/",
      });
      redirect("/dashboard");
    }

    return { ok: true };
  } catch (err: unknown) {
    if ((err as Error)?.message?.startsWith("NEXT_REDIRECT")) {
      throw err;
    }
    return { error: sanitizeAuthError(err) };
  }
}

export async function logoutAction(): Promise<void> {
  if (isLocalAuthEnabled()) {
    const store = await cookies();
    store.delete("fsms_local_session");
  } else {
    try {
      const supabase = await createSupabaseServerClient();
      await supabase.auth.signOut();
    } catch {}
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

  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    return { error: "Authentication service is not configured. Missing Supabase environment variables." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const baseUrl = await getAuthRedirectBaseUrl();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/auth/callback?next=/auth/reset-password`,
    });
    if (error) return { error: sanitizeAuthError(error) };
    // Generic response — never reveal whether the account exists.
    return { ok: true };
  } catch (err: unknown) {
    return { error: sanitizeAuthError(err) };
  }
}

export async function resetPasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: await translate("auth.passwordMin") };
  if (password !== confirm) return { error: await translate("auth.passwordMismatch") };

  if (isLocalAuthEnabled()) {
    return { ok: true };
  }

  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    return { error: "Authentication service is not configured. Missing Supabase environment variables." };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: sanitizeAuthError(error) };
    return { ok: true };
  } catch (err: unknown) {
    return { error: sanitizeAuthError(err) };
  }
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

  if (!env.supabaseUrl || !env.supabaseAnonKey) {
    redirect("/login?error=auth");
  }

  try {
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
  } catch {
    redirect("/login?error=auth");
  }
}
