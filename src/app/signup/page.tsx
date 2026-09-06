import { getTranslations } from "next-intl/server";
import { SignupForm } from "./signup-form";
import { Card, CardBody } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";

export const metadata = { title: "Create account — FSMS" };

export default async function SignupPage() {
  const t = await getTranslations("auth");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 pt-safe pb-safe py-10">
      <div className="mb-6 flex items-center gap-3">
        <Logo size={44} className="rounded-xl shadow-md" />
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">FSMS</h1>
          <p className="text-sm text-ink-muted">{t("brand")}</p>
        </div>
      </div>

      <Card className="w-full max-w-md">
        <CardBody className="py-6">
          <h2 className="text-base font-semibold text-ink">{t("signUpTitle")}</h2>
          <p className="mt-0.5 mb-5 text-sm text-ink-muted">{t("signUpSubtitle")}</p>
          <SignupForm />
        </CardBody>
      </Card>
    </main>
  );
}
