import Image from "next/image";
import { cn } from "@/lib/ui/cn";

export interface LogoProps {
  size?: number;
  className?: string;
  variant?: "symbol" | "full";
  alt?: string;
}

/**
 * FSMS V2 — Favoured School Management System official logo component.
 * Renders the golden Favoured 'D' crescent emblem.
 */
export function Logo({
  size = 32,
  className,
  alt = "Favoured School Management System logo",
}: LogoProps) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-950 shadow-sm border border-slate-800/60",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src="/logo.png"
        alt={alt}
        width={size}
        height={size}
        className="size-full object-contain p-0.5"
        priority
      />
    </div>
  );
}
