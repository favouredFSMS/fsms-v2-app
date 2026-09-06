"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { logoutAction } from "@/lib/auth/actions";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icons";
import { LanguageSwitcher } from "./language-switcher";
import { SCHOOL_TIMEZONE } from "@/lib/clock";

export interface HeaderUser {
  name: string;
  email: string;
  roleLabel: string;
}

export interface HeaderProps {
  title: string;
  subtitle?: string;
  user: HeaderUser;
  unreadCount?: number;
  onMenuToggle: () => void;
}

export function Header({ title, subtitle, user, unreadCount = 0, onMenuToggle }: HeaderProps) {
  const t = useTranslations("shell");
  const td = useTranslations("dashboard");
  const locale = useLocale();

  const [nvsTime, setNvsTime] = useState<string>("");

  useEffect(() => {
    function updateClock() {
      try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat(locale, {
          timeZone: SCHOOL_TIMEZONE,
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        setNvsTime(formatter.format(now));
      } catch {
        // Fallback
        setNvsTime(new Date().toLocaleDateString());
      }
    }
    updateClock();
    const timer = setInterval(updateClock, 30000);
    return () => clearInterval(timer);
  }, [locale]);

  return (
    <header className="flex min-h-[64px] shrink-0 items-center gap-3 border-b border-line bg-surface px-4 py-2 sm:px-6">
      {/* Mobile Menu Button */}
      <button
        type="button"
        onClick={onMenuToggle}
        className="rounded-lg p-2 text-ink-muted hover:bg-surface-sunken hover:text-ink focus-ring lg:hidden"
        aria-label={t("toggleNavigation")}
      >
        <Icon name="menu" size={20} />
      </button>

      {/* Page Title & Subtitle */}
      <div className="min-w-0 flex-1">
        <h1 className="flex items-center gap-2 truncate text-lg sm:text-xl font-bold tracking-tight text-[#0F172A]">
          <span>{title}</span>
          {title.startsWith("Welcome") || title.startsWith("Добро") || title.startsWith("Bienvenue") || title.startsWith("欢迎") ? (
            <span className="wave inline-block text-xl">👋</span>
          ) : null}
        </h1>
        {subtitle && (
          <p className="truncate text-xs sm:text-sm text-ink-muted">{subtitle}</p>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Novosibirsk Date Pill */}
        {nvsTime && (
          <div
            className="date-pill hidden xl:inline-flex"
            title={`Novosibirsk Time (${SCHOOL_TIMEZONE})`}
          >
            <Icon name="calendar" size={15} className="text-[#1E3A8A]" />
            <span className="tabular-nums">{nvsTime}</span>
            <span className="text-[11px] font-semibold text-ink-faint">
              ({td("novosibirskTime")})
            </span>
          </div>
        )}

        {/* Bell Notification Icon */}
        <Link
          href="/notifications"
          className="relative grid size-9.5 place-items-center rounded-lg border border-line bg-surface text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink focus-ring"
          aria-label="Notifications"
        >
          <Icon name="bell" size={18} />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-[#EF4444] px-1 text-[10px] font-bold text-white ring-2 ring-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>

        {/* Locale Language Switcher */}
        <LanguageSwitcher />

        {/* Desktop User Info */}
        <div className="hidden items-center gap-2.5 sm:flex border-l border-line pl-3">
          <Avatar name={user.name} size={34} className="bg-brand-50 text-brand-700 font-semibold" />
          <div className="leading-tight">
            <p className="max-w-[10rem] truncate text-xs font-semibold text-ink">
              {user.name}
            </p>
            <p className="max-w-[10rem] truncate text-[11px] text-ink-faint">
              {user.email}
            </p>
          </div>
          <Badge variant="brand">{user.roleLabel}</Badge>
        </div>

        {/* Sign Out Button */}
        <form action={logoutAction}>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs sm:text-sm font-medium text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink focus-ring"
            title={t("signOut")}
          >
            <Icon name="logout" size={16} />
            <span className="hidden md:inline">{t("signOut")}</span>
          </button>
        </form>
      </div>
    </header>
  );
}
