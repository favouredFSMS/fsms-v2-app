"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/ui/states";

/** Route-level error boundary (Phase 12): renders the design-system error state. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("states");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <ErrorState
        title={t("errorTitle")}
        description={error.message || t("errorDesc")}
        onRetry={reset}
      />
    </main>
  );
}
