"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/states";

/** Route-level error boundary (Phase 12): renders the design-system error state. */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <ErrorState
        title="Something went wrong"
        description={error.message || "The request could not be completed. Please try again."}
        onRetry={reset}
      />
    </main>
  );
}
