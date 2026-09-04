import type { ReactNode } from "react";
import { cn } from "@/lib/ui/cn";

export function Label({
  htmlFor,
  children,
  className,
}: {
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn("block text-sm font-medium text-ink-700", className)}
    >
      {children}
    </label>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-xs text-ink-faint">{children}</p>;
}

export function FieldError({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-sm text-danger-600">{children}</p>;
}

export interface FieldProps {
  label?: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Form field wrapper: label + control + hint/error.
 * Pass a control as children; `error` drives the danger state styling.
 */
export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
}: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <Label htmlFor={htmlFor}>
          {label}
          {required && <span className="ml-0.5 text-danger-600">*</span>}
        </Label>
      )}
      {children}
      {error ? <FieldError>{error}</FieldError> : hint ? <Hint>{hint}</Hint> : null}
    </div>
  );
}
