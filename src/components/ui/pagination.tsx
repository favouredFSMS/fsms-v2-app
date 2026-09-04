"use client";

import { cn } from "@/lib/ui/cn";
import { paginationRange, paginationSummary } from "@/lib/ui/pagination";
import { Icon } from "./icons";

export interface PaginationProps {
  page: number;
  pageSize?: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
  showSummary?: boolean;
}

const pageBtn =
  "flex h-8 min-w-8 items-center justify-center rounded-field px-2 text-sm " +
  "text-ink-muted hover:bg-surface-sunken hover:text-ink focus-ring disabled:opacity-40";

/** Reusable pagination control with ellipsis and jump targets. */
export function Pagination({
  page,
  pageSize = 20,
  total,
  onPageChange,
  className,
  showSummary = true,
}: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const range = paginationRange(current, pageCount);
  const currentIndex = range.items.indexOf(current);

  return (
    <nav
      className={cn("flex flex-wrap items-center justify-between gap-3", className)}
      aria-label="Pagination"
    >
      {showSummary ? (
        <p className="text-xs text-ink-faint">
          {paginationSummary(current, pageSize, total)}
        </p>
      ) : (
        <span />
      )}

      <div className="flex items-center gap-1">
        <button
          type="button"
          className={pageBtn}
          disabled={current <= 1}
          onClick={() => onPageChange(current - 1)}
          aria-label="Previous page"
        >
          <Icon name="chevron-left" size={16} />
        </button>

        {range.items.map((item, i) =>
          item === "…" ? (
            <button
              key={`j${i}`}
              type="button"
              className={cn(pageBtn, "text-ink-faint")}
              onClick={() => {
                const isLeft = i < currentIndex;
                const target = isLeft ? range.previousJump : range.nextJump;
                if (target) onPageChange(target);
              }}
              aria-label="Jump pages"
            >
              …
            </button>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              aria-current={item === current ? "page" : undefined}
              className={cn(
                pageBtn,
                item === current && "bg-brand-600 font-semibold text-ink-inverse hover:bg-brand-700",
              )}
            >
              {item}
            </button>
          ),
        )}

        <button
          type="button"
          className={pageBtn}
          disabled={current >= pageCount}
          onClick={() => onPageChange(current + 1)}
          aria-label="Next page"
        >
          <Icon name="chevron-right" size={16} />
        </button>
      </div>
    </nav>
  );
}
