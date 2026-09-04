import { cache } from "react";

/**
 * FSMS V2 — per-request data loader (Phase 10).
 *
 * React's `cache()` memoizes a fetch for the lifetime of one request, so
 * multiple Server Components in the same tree that need the same data share a
 * single database call (per-request data-loader dedup). Wrap a repository
 * call once and pass the loader down:
 *
 *   const loadStudents = createRequestLoader(
 *     (filters) => new StudentRepository(ctx).search(filters),
 *   );
 */
export function createRequestLoader<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
  return cache(fn);
}

/** Stable cache key builder for TanStack Query (client-side cache). */
export function cacheKey(...parts: unknown[]): unknown[] {
  return parts.filter((p) => p !== undefined && p !== null);
}
