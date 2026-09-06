"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/ui/cn";
import { Icon } from "@/components/ui/icons";
import { Logo } from "@/components/ui/logo";
import { Avatar } from "@/components/ui/avatar";
import type { NavSection } from "./nav";
import type { HeaderUser } from "./header";

export interface SidebarProps {
  sections: NavSection[];
  brand: string;
  user?: HeaderUser;
  onNavigate?: () => void;
}

export function Sidebar({ sections, brand, user, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const td = useTranslations("dashboard");

  return (
    <div className="flex h-full flex-col bg-[#1E3A8A] text-white">
      {/* V99 Brand Header */}
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-4">
        <Logo size={32} className="rounded-lg shadow-sm" />
        <div className="min-w-0 flex-1">
          <span className="block truncate text-base font-bold tracking-wider text-white">
            {brand}
          </span>
          <span className="block truncate text-[11px] font-medium text-indigo-200">
            School Management System
          </span>
        </div>
      </div>

      {/* V99 Navigation List */}
      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 py-3">
        {sections.map((section, i) => (
          <div key={section.title ?? i} className="mb-4">
            {section.title && (
              <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-indigo-300/70">
                {t(section.title)}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-[14px] font-medium transition-all focus-ring",
                        active
                          ? "bg-[#F4B400] text-[#1F2937] font-semibold shadow-sm"
                          : "text-[#C7D2FE] hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <span className={cn("shrink-0", active ? "text-[#1F2937]" : "text-[#A5B4FC]")}>
                        <Icon name={item.icon} size={18} />
                      </span>
                      <span className="truncate">{t(item.label)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* V99 Bottom User Profile Card */}
      {user && (
        <div className="m-3 flex items-center gap-2.5 rounded-xl bg-white/10 p-2.5">
          <Avatar name={user.name} size={34} className="bg-white text-indigo-900 font-bold" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[13px] font-semibold text-white">
              {user.name}
            </p>
            <p className="truncate text-[11px] text-[#C7D2FE]">
              {user.roleLabel}
            </p>
            <div className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-[#6EE7B7]">
              <span className="inline-block size-1.5 rounded-full bg-[#10B981]" />
              <span>{td("activeNow")}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
