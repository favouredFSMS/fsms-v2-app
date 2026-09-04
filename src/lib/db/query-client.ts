"use client";

import { QueryClient } from "@tanstack/react-query";

/**
 * FSMS V2 — TanStack Query client (ADR-11, Phase 10).
 *
 * Server state cache for client components. One shared instance in the
 * browser; a fresh one per server render (so no state leaks across requests).
 * Defaults favour freshness for school data (short staleTime) without
 * hammering the API.
 */

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

let browserClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (typeof window === "undefined") {
    return makeQueryClient(); // server render — fresh instance
  }
  if (!browserClient) {
    browserClient = makeQueryClient();
  }
  return browserClient;
}
