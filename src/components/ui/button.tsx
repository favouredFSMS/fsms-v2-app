import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/ui/cn";
import { Spinner } from "./spinner";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export function buttonStyles(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
): string {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-field font-medium " +
    "transition-colors focus-ring disabled:opacity-50 disabled:pointer-events-none select-none";

  const variants: Record<ButtonVariant, string> = {
    primary:
      "bg-brand-600 text-ink-inverse hover:bg-brand-700 active:bg-brand-800 shadow-card",
    secondary:
      "bg-surface text-ink border border-line-strong hover:bg-surface-sunken active:bg-ink-100",
    ghost: "bg-transparent text-ink-muted hover:bg-ink-100 hover:text-ink",
    danger: "bg-danger-600 text-ink-inverse hover:bg-danger-700 active:bg-danger-700",
  };

  const sizes: Record<ButtonSize, string> = {
    sm: "text-sm px-2.5 py-1.5",
    md: "text-sm px-3.5 py-2",
    lg: "text-base px-5 py-2.5",
  };

  return cn(base, variants[variant], sizes[size], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

/** Reusable action button with loading state. */
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={buttonStyles(variant, size, className)}
      {...rest}
    >
      {loading && <Spinner size={size === "lg" ? 18 : 16} className="shrink-0" />}
      {children}
    </button>
  );
}

export interface ButtonLinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** Link styled identically to <Button> (for navigation actions). */
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonLinkProps) {
  return (
    <Link href={href} className={buttonStyles(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}
