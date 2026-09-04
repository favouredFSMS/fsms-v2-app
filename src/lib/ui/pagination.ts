/**
 * FSMS V2 — pagination range helper (pure, testable).
 *
 * Returns the page numbers to render for a pagination control, with `…`
 * placeholders (as null) around the current page. A gap of a single page is
 * shown as that page (never ellipsized). Used by <Pagination/>.
 */

export interface PaginationRange {
  items: Array<number | "…">;
  /** jump target for the leading "…" (page just before the middle window) */
  previousJump: number | null;
  /** jump target for the trailing "…" (page just after the middle window) */
  nextJump: number | null;
}

export function paginationRange(
  page: number,
  pageCount: number,
  siblings = 1,
): PaginationRange {
  const total = Math.max(1, pageCount);
  const current = Math.min(Math.max(1, page), total);

  if (total === 1) {
    return { items: [1], previousJump: null, nextJump: null };
  }

  const left = Math.max(2, current - siblings);
  const right = Math.min(total - 1, current + siblings);

  const items: Array<number | "…"> = [1];
  let previousJump: number | null = null;
  let nextJump: number | null = null;

  if (left === 3) {
    items.push(2); // single hidden page — show it
  } else if (left > 3) {
    items.push("…");
    previousJump = left - 1;
  }

  for (let p = left; p <= right; p++) items.push(p);

  if (right === total - 2) {
    items.push(total - 1); // single hidden page — show it
  } else if (right < total - 2) {
    items.push("…");
    nextJump = right + 1;
  }

  items.push(total);

  return { items, previousJump, nextJump };
}

/** Human-readable "showing X–Y of Z" for list footers. */
export function paginationSummary(
  page: number,
  pageSize: number,
  total: number,
): string {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  return `Showing ${first}–${last} of ${total}`;
}
