"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { getQueryClient } from "./query-client";

/**
 * FSMS V2 — client providers (Phase 10).
 *
 * Wraps the app tree with the TanStack Query client so client components can
 * use server-state caching + optimistic updates. Mounted once in the root
 * layout.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>
  );
}
