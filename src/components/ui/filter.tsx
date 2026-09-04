"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";
import { Icon } from "./icons";

/** Horizontal container for search + filter controls. */
export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>
  );
}

export interface SelectFilterProps {
  label?: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  onChange: (value: string) => void;
  className?: string;
}

/** Labelled select used as a single filter. */
export function SelectFilter({
  label,
  value,
  options,
  placeholder = "All",
  onChange,
  className,
}: SelectFilterProps) {
  return (
    <label className={cn("flex items-center gap-1.5 text-sm text-ink-muted", className)}>
      {label && <span className="shrink-0">{label}</span>}
      <span className="relative inline-flex">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none rounded-field border bg-surface py-1.5 pl-2.5 pr-8 text-sm text-ink focus:border-brand-500 focus-ring"
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint">
          <Icon name="chevron-down" size={14} />
        </span>
      </span>
    </label>
  );
}

export interface FilterPillProps {
  label: string;
  value: ReactNode;
  onClear: () => void;
}

/** Shows an active filter with a clear ("×") control. */
export function FilterPill({ label, value, onClear }: FilterPillProps) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pl-2.5 pr-1 text-xs font-medium text-brand-800">
      <span className="text-ink-muted">{label}:</span> {value}
      <button
        type="button"
        onClick={onClear}
        className="rounded-full p-0.5 text-brand-700 hover:bg-brand-100 focus-ring"
        aria-label={`Clear ${label} filter`}
      >
        <Icon name="close" size={12} />
      </button>
    </span>
  );
}
