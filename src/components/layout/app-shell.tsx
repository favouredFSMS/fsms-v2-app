"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/ui/cn";
import { Sidebar } from "./sidebar";
import { Header, type HeaderUser } from "./header";
import type { NavSection } from "./nav";

export interface AppShellProps {
  brand: string;
  title: string;
  user: HeaderUser;
  sections: NavSection[];
  children: ReactNode;
}

/**
 * Application shell: fixed sidebar + header + responsive content column.
 * On mobile the sidebar collapses into an overlay drawer.
 */
export function AppShell({ brand, title, user, sections, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => setMobileOpen(false);

  return (
    <div className="flex min-h-screen">
      {/* desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-line bg-surface lg:block">
        <Sidebar sections={sections} brand={brand} />
      </aside>

      {/* mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="presentation">
          <div
            className="absolute inset-0 bg-ink-950/50"
            onClick={close}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-surface shadow-dialog">
            <Sidebar sections={sections} brand={brand} onNavigate={close} />
          </aside>
        </div>
      )}

      {/* content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="pt-safe">
          <Header title={title} user={user} onMenuToggle={() => setMobileOpen((v) => !v)} />
        </div>
        <main className={cn("flex-1 p-4 pb-safe sm:p-6")}>{children}</main>
      </div>
    </div>
  );
}
