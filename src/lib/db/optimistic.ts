/**
 * FSMS V2 — optimistic-update helpers (Phase 10).
 *
 * Pure list transforms used inside TanStack Query `onMutate` handlers so a
 * mutation updates the cache instantly and rolls back on error. Kept as pure
 * functions so they are trivially unit-testable and reusable across aggregates.
 *
 * Guardrail (ADR-11): optimistic updates are only used where SAFE — quick,
 * reversible, single-user edits (e.g. attendance marks, homework grading) —
 * never for financial or irreversible operations, which always await the
 * server round trip.
 *
 * Typical usage:
 *
 *   const qc = useQueryClient();
 *   const mutation = useMutation({
 *     mutationFn: (patch) => saveAttendance(patch),
 *     onMutate: async (patch) => {
 *       await qc.cancelQueries({ queryKey: ["attendance"] });
 *       const prev = qc.getQueryData(["attendance"]);
 *       qc.setQueryData(["attendance"], (rows) =>
 *         rows ? mergeById(rows, { ...patch, id: patch.id }) : rows);
 *       return { prev };
 *     },
 *     onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(["attendance"], ctx.prev),
 *   });
 */

export function mergeById<T extends { id: string }>(items: T[], updated: T): T[] {
  return items.map((item) => (item.id === updated.id ? updated : item));
}

export function upsertById<T extends { id: string }>(items: T[], updated: T): T[] {
  const exists = items.some((item) => item.id === updated.id);
  return exists ? mergeById(items, updated) : [...items, updated];
}

export function removeById<T extends { id: string }>(items: T[], id: string): T[] {
  return items.filter((item) => item.id !== id);
}

export function prependItem<T extends { id: string }>(items: T[], item: T): T[] {
  return [item, ...items.filter((i) => i.id !== item.id)];
}
