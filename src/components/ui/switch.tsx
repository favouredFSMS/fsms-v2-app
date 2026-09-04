"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export interface SwitchProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
}

export function Switch({ label, className, id, ...rest }: SwitchProps) {
  return (
    <label className={cn("inline-flex items-center gap-2.5 text-sm", className)}>
      <span className="relative inline-flex shrink-0 cursor-pointer">
        <input id={id} type="checkbox" className="peer sr-only" {...rest} />
        <span className="h-5 w-9 rounded-full bg-ink-300 transition-colors peer-checked:bg-brand-600 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-500 peer-disabled:opacity-50" />
        <span className="absolute left-0.5 top-0.5 size-4 rounded-full bg-surface shadow transition-transform peer-checked:translate-x-4" />
      </span>
      {label && <span className="text-ink-800">{label}</span>}
    </label>
  );
}
