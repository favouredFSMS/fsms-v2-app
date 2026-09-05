import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * FSMS V2 — Supabase Auth callback (PKCE code exchange).
 * GoTrue redirects here after email confirmation / magic link / OAuth.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // Determine the effective base URL honoring proxy headers (e.g. Vercel)
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");
  const proto =
    request.headers.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") || host?.startsWith("127.0.0.1") ? "http" : "https");
  const base = host ? `${proto}://${host}` : origin;

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const target = next.startsWith("/") ? next : `/${next}`;
      return NextResponse.redirect(`${base}${target}`);
    }
  }
  return NextResponse.redirect(`${base}/login?error=auth`);
}
