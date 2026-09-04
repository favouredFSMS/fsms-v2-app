import { ResetForm } from "./reset-form";
import { Card, CardBody } from "@/components/ui/card";

export const metadata = { title: "Set new password — FSMS V2" };

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardBody className="py-6">
          <h1 className="text-base font-semibold text-ink">Choose a new password</h1>
          <p className="mt-0.5 mb-5 text-sm text-ink-muted">At least 8 characters.</p>
          <ResetForm />
        </CardBody>
      </Card>
    </main>
  );
}
