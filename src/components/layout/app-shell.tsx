"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/ui/cn";
import { Sidebar } from "./sidebar";
import { Header, type HeaderUser } from "./header";
import type { NavSection } from "./nav";

export interface AppShellProps {
  brand?: string;
  title: string;
  subtitle?: string;
  user: HeaderUser;
  sections: NavSection[];
  children: ReactNode;
}

/**
 * Application shell: fixed sidebar + header + responsive content column.
 * On mobile the sidebar collapses into an overlay drawer.
 */
export function AppShell({ brand = "FSMS", title, subtitle, user, sections, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => setMobileOpen(false);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* desktop sidebar */}
      <aside className="hidden w-[248px] shrink-0 bg-[#1E3A8A] lg:block">
        <Sidebar sections={sections} brand={brand} user={user} />
      </aside>

      {/* mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="presentation">
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
            onClick={close}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-[#1E3A8A] shadow-dialog">
            <Sidebar sections={sections} brand={brand} user={user} onNavigate={close} />
          </aside>
        </div>
      )}

      {/* content column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="pt-safe">
          <Header
            title={title}
            subtitle={subtitle}
            user={user}
            onMenuToggle={() => setMobileOpen((v) => !v)}
          />
        </div>
        <main className={cn("flex-1 p-4 pb-safe sm:p-6 lg:p-7")}>{children}</main>
      </div>
    </div>
  );
}
