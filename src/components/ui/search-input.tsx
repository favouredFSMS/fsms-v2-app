"use client";

import { useTranslations } from "next-intl";

import { useEffect, useState, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";
import { useDebouncedValue } from "@/lib/ui/use-debounced-value";
import { Icon } from "./icons";

export interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: string;
  onValueChange?: (value: string) => void;
  onDebouncedChange?: (value: string) => void;
  debounceMs?: number;
  placeholder?: string;
  className?: string;
}

/**
 * Search box with clear button and a debounced change callback.
 * Debouncing keeps keystrokes from hammering the backend (performance rule).
 */
export function SearchInput({
  value,
  onValueChange,
  onDebouncedChange,
  debounceMs = 300,
  placeholder = "Search…",
  className,
  ...rest
}: SearchInputProps) {
  const t = useTranslations("common");
  const [internal, setInternal] = useState("");
  const current = value ?? internal;
  const debounced = useDebouncedValue(current, debounceMs);

  useEffect(() => {
    onDebouncedChange?.(debounced);
  }, [debounced, onDebouncedChange]);

  const setValue = (v: string) => {
    setInternal(v);
    onValueChange?.(v);
  };

  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
        <Icon name="search" size={16} />
      </span>
      <input
        type="search"
        value={current}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-field border bg-surface py-2 pl-9 pr-8 text-sm text-ink placeholder:text-ink-faint focus:border-brand-500 focus-ring"
        {...rest}
      />
      {current && (
        <button
          type="button"
          onClick={() => setValue("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-ink-faint hover:bg-surface-sunken hover:text-ink focus-ring"
          aria-label={t("clearSearch")}
        >
          <Icon name="close" size={14} />
        </button>
      )}
    </div>
  );
}
