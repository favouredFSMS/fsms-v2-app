"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/ui/cn";
import { Icon } from "@/components/ui/icons";
import type { NavSection } from "./nav";

export interface SidebarProps {
  sections: NavSection[];
  brand: string;
  onNavigate?: () => void;
}

export function Sidebar({ sections, brand, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-line px-4">
        <span className="flex size-7 items-center justify-center rounded-field bg-brand-600 text-ink-inverse">
          <Icon name="students" size={16} />
        </span>
        <span className="truncate text-sm font-bold tracking-tight text-ink">
          {brand}
        </span>
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-4">
        {sections.map((section, i) => (
          <div key={section.title ?? i} className="mb-5">
            {section.title && (
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                {t(section.title)}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-field px-3 py-2 text-sm font-medium transition-colors focus-ring",
                        active
                          ? "bg-brand-50 text-brand-800"
                          : "text-ink-muted hover:bg-surface-sunken hover:text-ink",
                      )}
                    >
                      <Icon name={item.icon} size={18} />
                      <span className="truncate">{t(item.label)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
