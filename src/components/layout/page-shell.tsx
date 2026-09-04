import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth/guards";
import { profileCan } from "@/lib/auth/authorize";
import { AppShell } from "./app-shell";
import { NAV_SECTIONS, visibleNavSections } from "./nav";
import { EmptyState } from "@/components/ui/states";

/**
 * Shared server-side page shell (Phase 12+): resolves the signed-in user,
 * builds the permission-filtered navigation, and renders the AppShell. Pages
 * pass their content as children; a `permission` gate renders an inline
 * access-denied state instead of a raw 500.
 */
export async function PageShell({
  title,
  permission,
  children,
}: {
  title: string;
  permission?: string;
  children: ReactNode;
}) {
  const [t, rolesT] = await Promise.all([getTranslations("shell"), getTranslations("roles")]);
  const profile = await requireUser();

  const roleKey = profile.role_key ?? profile.role_base;
  const roleLabel = roleKey && rolesT.has(roleKey) ? rolesT(roleKey) : roleKey;

  const sections = visibleNavSections(NAV_SECTIONS, (a) => profileCan(profile, a));
  const user = {
    name: profile.name ?? profile.email ?? t("fsmsUser"),
    email: profile.email ?? "",
    roleLabel,
  };

  if (permission && !profileCan(profile, permission)) {
    return (
      <AppShell brand="FSMS V2" title={title} user={user} sections={sections}>
        <EmptyState
          icon="warning"
          title={t("accessDenied")}
          description={t("accessDeniedDesc", { permission })}
        />
      </AppShell>
    );
  }

  return (
    <AppShell brand="FSMS V2" title={title} user={user} sections={sections}>
      {children}
    </AppShell>
  );
}
