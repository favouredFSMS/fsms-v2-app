import { cn } from "@/lib/ui/cn";

const PALETTE = [
  "bg-brand-500",
  "bg-success-500",
  "bg-warning-500",
  "bg-danger-500",
  "bg-info-500",
  "bg-brand-700",
  "bg-success-700",
  "bg-warning-700",
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function tone(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
  /** e.g. Top-3 board badge "1" | "2" | "3" */
  badge?: string | null;
  /** colour for the badge ring (defaults to brand) */
  badgeClassName?: string;
}

export function Avatar({
  name,
  src,
  size = 36,
  className,
  badge,
  badgeClassName,
}: AvatarProps) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      <span
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-full font-semibold text-ink-inverse ring-1 ring-black/5",
          !src && tone(name),
        )}
        style={{ width: size, height: size, fontSize: size * 0.38 }}
        aria-hidden="true"
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="size-full object-cover" />
        ) : (
          initials(name)
        )}
      </span>
      {badge && (
        <span
          className={cn(
            "absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full text-[9px] font-bold text-ink-inverse ring-2 ring-surface",
            badgeClassName ?? "bg-brand-600",
          )}
          title={`Top ${badge}`}
        >
          {badge}
        </span>
      )}
    </span>
  );
}
