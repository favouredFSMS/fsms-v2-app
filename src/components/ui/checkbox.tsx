import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
  description?: ReactNode;
}

export function Checkbox({ label, description, className, id, ...rest }: CheckboxProps) {
  return (
    <label className={cn("flex items-start gap-2.5 text-sm", className)}>
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 rounded border-line-strong text-brand-600 focus-ring"
        {...rest}
      />
      {(label || description) && (
        <span className="flex flex-col">
          {label && <span className="text-ink-800">{label}</span>}
          {description && <span className="text-xs text-ink-faint">{description}</span>}
        </span>
      )}
    </label>
  );
}
