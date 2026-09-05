import { getTranslations } from "next-intl/server";
import { ResetForm } from "./reset-form";
import { Card, CardBody } from "@/components/ui/card";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Set new password — FSMS V2" };

export default async function ResetPasswordPage(props: {
  searchParams?: Promise<{ code?: string }>;
}) {
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  if (searchParams?.code) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(searchParams.code);
  }

  const t = await getTranslations("auth");
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardBody className="py-6">
          <h1 className="text-base font-semibold text-ink">{t("chooseNewPassword")}</h1>
          <p className="mt-0.5 mb-5 text-sm text-ink-muted">{t("atLeast8")}</p>
          <ResetForm />
        </CardBody>
      </Card>
    </main>
  );
}
