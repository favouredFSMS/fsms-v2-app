"use client";

import { useEffect } from "react";

/**
 * FSMS V2 — Root-level error boundary (Phase 32 / Errors checklist item).
 * Catches errors in the root layout and renders a standalone recovery screen.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global uncaught error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center p-6 bg-slate-50 text-slate-900 font-sans">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg border border-slate-200 p-8 text-center">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
            !
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-600 mb-6">
            An unexpected error occurred. Please try again or refresh the page.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
