import { getTranslations } from "next-intl/server";
import { LoginForm } from "./login-form";
import { Card, CardBody } from "@/components/ui/card";
import { Icon } from "@/components/ui/icons";

export const metadata = { title: "Sign in — FSMS V2" };

export default async function LoginPage() {
  const t = await getTranslations("auth");
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-card bg-brand-600 text-ink-inverse">
          <Icon name="students" size={22} />
        </span>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink">FSMS V2</h1>
          <p className="text-sm text-ink-muted">{t("brand")}</p>
        </div>
      </div>

      <Card className="w-full max-w-sm">
        <CardBody className="py-6">
          <h2 className="text-base font-semibold text-ink">{t("signInTitle")}</h2>
          <p className="mt-0.5 mb-5 text-sm text-ink-muted">{t("signInSubtitle")}</p>
          <LoginForm />
        </CardBody>
      </Card>
    </main>
  );
}
