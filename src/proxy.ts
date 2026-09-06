import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/**
 * FSMS V2 — request middleware (Phase 8).
 *
 *  - Supabase mode: refresh the auth session on every request and redirect
 *    unauthenticated visitors away from protected routes.
 *  - Local dev mode (no Supabase configured): gate on the dev session cookie
 *    (server-side code performs the real HMAC + profile verification).
 *
 * Route protection is UX-level here; the authoritative gate is the server
 * guards + database RLS.
 */

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/forgot-password",
  "/auth/callback",
  "/auth/confirm",
  "/auth/reset-password",
  "/design-system",
];

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

function redirectWithCookies(url: URL, sourceResponse: NextResponse): NextResponse {
  const redirectRes = NextResponse.redirect(url);
  sourceResponse.cookies.getAll().forEach((cookie) => {
    redirectRes.cookies.set(cookie.name, cookie.value, cookie);
  });
  return redirectRes;
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasAuthParams =
    request.nextUrl.searchParams.has("reason") ||
    request.nextUrl.searchParams.has("error") ||
    request.nextUrl.searchParams.has("logout");

  // ── local dev harness ──────────────────────────────────────────────────
  if (!env.supabaseUrl) {
    const hasSession = request.cookies.has("fsms_local_session");
    if (!hasSession && !isPublicPath(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    if (hasSession && (pathname === "/login" || pathname === "/signup" || pathname === "/") && !hasAuthParams) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // ── Supabase: session refresh + protection ─────────────────────────────
  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return redirectWithCookies(url, response);
  }
  if (user && (pathname === "/login" || pathname === "/signup" || pathname === "/") && !hasAuthParams) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return redirectWithCookies(url, response);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Run on everything except Next internals and static assets, so session
     * refresh and protection cover the whole app. PWA assets (sw.js,
     * offline.html, manifest, icons) are public so installability and offline
     * fallback work regardless of session state.
     */
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|offline\\.html|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
