import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";
import { Icon, type IconName } from "./icons";
import { SkeletonText } from "./skeleton";
import { Spinner } from "./spinner";

/** Centered loading state for async pages/panels. */
export function LoadingState({
  label = "Loading…",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 py-16 text-ink-muted",
        className,
      )}
      role="status"
    >
      <Spinner size={28} />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Empty state (no data). */
export function EmptyState({
  icon = "inbox",
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 py-16 text-center",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-sunken text-ink-400">
        <Icon name={icon} size={22} />
      </span>
      <p className="text-sm font-semibold text-ink-700">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-ink-muted">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  description?: ReactNode;
  onRetry?: () => void;
  className?: string;
}

/** Error state with optional retry. */
export function ErrorState({
  title = "Something went wrong",
  description = "The request could not be completed. Please try again.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 py-16 text-center",
        className,
      )}
      role="alert"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-danger-50 text-danger-600">
        <Icon name="danger" size={22} />
      </span>
      <p className="text-sm font-semibold text-ink-700">{title}</p>
      <p className="max-w-sm text-sm text-ink-muted">{description}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/** Table-shaped skeleton for list loading. */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2 p-4">
      <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonText key={i} lines={1} />
        ))}
      </div>
      <div className="divide-y divide-line">
        {Array.from({ length: rows }).map((_, r) => (
          <div
            key={r}
            className="grid items-center gap-3 py-3"
            style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
          >
            {Array.from({ length: cols }).map((_, c) => (
              <SkeletonText key={c} lines={1} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
