import Link from "next/link";

/**
 * Keyset-pagination footer for server-rendered lists: shows the count and a
 * "Next" link carrying the opaque cursor. Cursors are passed straight through —
 * pages never decode them (opaque by design).
 */
export function CursorPager({
  basePath,
  search,
  total,
  shown,
  nextCursor,
  extraParams,
}: {
  basePath: string;
  search?: string;
  total: number;
  shown: number;
  nextCursor: string | null;
  extraParams?: Record<string, string>;
}) {
  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (extraParams) for (const [k, v] of Object.entries(extraParams)) if (v) params.set(k, v);
  if (nextCursor) params.set("cursor", nextCursor);
  const href = `${basePath}${params.size ? `?${params.toString()}` : ""}`;

  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-xs text-ink-faint">
      <span>
        showing {shown} of {total}
      </span>
      {nextCursor ? (
        <Link href={href} className="text-brand-600 hover:text-brand-700">
          Next page →
        </Link>
      ) : (
        <span>end of list</span>
      )}
    </div>
  );
}
