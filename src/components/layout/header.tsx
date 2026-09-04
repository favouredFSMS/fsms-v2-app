"use client";

import { useTranslations } from "next-intl";
import { logoutAction } from "@/lib/auth/actions";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icons";
import { LanguageSwitcher } from "./language-switcher";

export interface HeaderUser {
  name: string;
  email: string;
  roleLabel: string;
}

export interface HeaderProps {
  title: string;
  user: HeaderUser;
  onMenuToggle: () => void;
}

export function Header({ title, user, onMenuToggle }: HeaderProps) {
  const t = useTranslations("shell");
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4">
      <button
        type="button"
        onClick={onMenuToggle}
        className="rounded-field p-1.5 text-ink-muted hover:bg-surface-sunken hover:text-ink focus-ring lg:hidden"
        aria-label={t("toggleNavigation")}
      >
        <Icon name="menu" size={20} />
      </button>

      <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-ink">
        {title}
      </h1>

      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <div className="hidden items-center gap-2.5 sm:flex">
          <Avatar name={user.name} size={30} />
          <div className="leading-tight">
            <p className="max-w-[12rem] truncate text-sm font-medium text-ink">
              {user.name}
            </p>
            <p className="max-w-[12rem] truncate text-xs text-ink-faint">
              {user.email}
            </p>
          </div>
          <Badge variant="brand">{user.roleLabel}</Badge>
        </div>

        <form action={logoutAction}>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-field border border-line-strong bg-surface px-2.5 py-1.5 text-sm text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink focus-ring"
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
