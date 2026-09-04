import type { InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";

const controlBase =
  "w-full rounded-field border bg-surface px-3 py-2 text-sm text-ink " +
  "placeholder:text-ink-faint focus-ring " +
  "focus:border-brand-500 disabled:bg-surface-sunken disabled:text-ink-faint";

export function Input({
  className,
  type = "text",
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input type={type} className={cn(controlBase, className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(controlBase, "min-h-24 py-2", className)} {...rest} />;
}

export function Select({
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlBase, "pr-8", className)} {...rest}>
      {children}
    </select>
  );
}
