/**
 * FSMS V2 — keyset pagination types (Phase 10).
 *
 * Pages are returned as `{ items, total, nextCursor }`. The cursor is OPAQUE:
 * its encoding (sort-key tuple) is owned by the SQL functions in the database
 * (e.g. fsms.student_search), so the data layer never has to parse it — it just
 * passes `nextCursor` back into the next call. This keeps keyset paging stable
 * under inserts/deletes (no offset drift) and index-friendly (no OFFSET scans).
 */

export interface Page<T> {
  items: T[];
  /** total matching rows across all pages (for "showing X–Y of Z") */
  total: number;
  /** opaque keyset cursor for the next page, or null on the last page */
  nextCursor: string | null;
}

export function emptyPage<T>(): Page<T> {
  return { items: [], total: 0, nextCursor: null };
}
