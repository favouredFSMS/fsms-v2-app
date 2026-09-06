import { getTranslations } from "next-intl/server";
import { LoginForm } from "./login-form";
import { Card, CardBody } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { env } from "@/lib/env";

export const metadata = { title: "Sign in — FSMS" };

export default async function LoginPage(props: {
  searchParams?: Promise<{ reason?: string; error?: string }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const t = await getTranslations("auth");
  // Google OAuth (F1.1) requires a provisioned Supabase project with the
  // Google provider enabled; the local harness has neither.
  const googleEnabled = !!env.supabaseUrl;

  const errorBanner =
    searchParams?.reason === "inactive"
      ? "Your account is not active. Please contact an administrator."
      : searchParams?.error === "session-expired"
        ? "Your session has expired. Please sign in again."
        : searchParams?.error === "google-unavailable"
          ? "Google sign-in is not available in local development."
          : searchParams?.error === "auth"
            ? "Authentication failed. Please try again."
            : null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 pt-safe pb-safe py-10">
      <div className="mb-6 flex items-center gap-3">
        <Logo size={44} className="rounded-xl shadow-md" />
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">FSMS</h1>
          <p className="text-sm text-ink-muted">{t("brand")}</p>
        </div>
      </div>

      <Card className="w-full max-w-sm">
        <CardBody className="py-6">
          <h2 className="text-base font-semibold text-ink">{t("signInTitle")}</h2>
          <p className="mt-0.5 mb-5 text-sm text-ink-muted">{t("signInSubtitle")}</p>
          {errorBanner && (
            <div className="mb-4 rounded-field bg-danger-50 border border-danger-200 px-3 py-2 text-sm text-danger-700">
              {errorBanner}
            </div>
          )}
          <LoginForm googleEnabled={googleEnabled} />
        </CardBody>
      </Card>
    </main>
  );
}
