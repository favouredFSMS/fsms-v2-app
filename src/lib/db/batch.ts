/**
 * FSMS V2 — batched reads (Phase 10).
 *
 * Splitting large `IN (…)` filters into small batches avoids Postgres
 * parameter limits and keeps each round trip cheap; `inBatches` chains the
 * batches and concatenates results in order.
 */

export const DEFAULT_BATCH_SIZE = 100;

export function chunk<T>(items: T[], size = DEFAULT_BATCH_SIZE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export async function inBatches<T, R>(
  items: T[],
  fn: (batch: T[]) => Promise<R[]>,
  size = DEFAULT_BATCH_SIZE,
): Promise<R[]> {
  const results: R[] = [];
  for (const batch of chunk(items, size)) {
    results.push(...(await fn(batch)));
  }
  return results;
}
