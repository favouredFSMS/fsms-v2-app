import { getTranslations } from "next-intl/server";
import { ForgotForm } from "./forgot-form";
import { Card, CardBody } from "@/components/ui/card";

export const metadata = { title: "Forgot password — FSMS" };

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth");
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardBody className="py-6">
          <h1 className="text-base font-semibold text-ink">{t("resetYourPassword")}</h1>
          <p className="mt-0.5 mb-5 text-sm text-ink-muted">{t("resetSubtitle")}</p>
          <ForgotForm />
        </CardBody>
      </Card>
    </main>
  );
}
