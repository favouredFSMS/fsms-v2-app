import type { IconName } from "@/components/ui/icons";

/**
 * FSMS V2 — navigation model (Phase 9 scaffold).
 *
 * Sections mirror the route groups defined in the architecture (§5.1):
 * dashboard / people / classes / attendance / homework / lessons / assessments
 * / curriculum / materials / reports / payments / messaging / settings /
 * admin / learner / family.
 *
 * Each item is gated by a V101 permission action. Where a feature's canonical
 * permission does not exist in the catalog yet, the nearest action is used and
 * the item is documented as a placeholder — gating is FAIL-CLOSED, so an
 * unknown action is visible to admin1 (wildcard) only until its phase lands
 * and the exact key is wired up.
 */

export interface NavItem {
  href: string;
  /** Translation key under the `nav` namespace (rendered via next-intl). */
  label: string;
  icon: IconName;
  /** V101 permission action required to see the item (fail-closed). */
  permission?: string;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { href: "/dashboard", label: "dashboard", icon: "dashboard", permission: "dashboard" },
    ],
  },
  {
    title: "school",
    items: [
      { href: "/people", label: "people", icon: "people", permission: "users" },
      { href: "/students", label: "students", icon: "students", permission: "students" },
      { href: "/parents", label: "parents", icon: "parents", permission: "parents" },
      { href: "/classes", label: "classes", icon: "classes", permission: "classes" },
      // canonical "attendance" lands in Phase 14; attendanceGrid is the current gate
      { href: "/attendance", label: "attendance", icon: "attendance", permission: "attendanceGrid" },
    ],
  },
  {
    title: "teaching",
    items: [
      { href: "/homework", label: "homework", icon: "homework", permission: "homework" },
      // canonical "lessons" lands in Phase 16; lessonCalendar is the current gate
      { href: "/lessons", label: "lessons", icon: "lessons", permission: "lessonCalendar" },
      { href: "/assessments", label: "assessments", icon: "assessments", permission: "assessments" },
      { href: "/curriculum", label: "curriculum", icon: "curriculum", permission: "curriculum" },
      // canonical "materials" lands in Phase 19; materialCatalog is the current gate
      { href: "/materials", label: "materials", icon: "materials", permission: "materialCatalog" },
      // canonical "ai" lands in Phase 21; aiAsk is the staff gate
      { href: "/ai", label: "ai", icon: "ai", permission: "aiAsk" },
    ],
  },
  {
    title: "finances",
    items: [
      // canonical "finance" lands in Phase 23; payments is the family+staff gate
      { href: "/finance", label: "payments", icon: "payments", permission: "payments" },
      { href: "/payroll", label: "payroll", icon: "payroll", permission: "payrollRoster" },
    ],
  },
  {
    title: "communication",
    items: [
      // canonical "messaging" lands in Phase 22; messageConversations is the gate
      { href: "/messaging", label: "messaging", icon: "messaging", permission: "messageConversations" },
      { href: "/notifications", label: "notifications", icon: "notifications", permission: "notifications" },
    ],
  },
  {
    title: "administration",
    items: [
      // canonical "reports" lands in Phase 20; the base `report` action is granted
      // to every role, and each report re-checks its own finer permission inside
      // its SECURITY DEFINER RPC.
      { href: "/reports", label: "reports", icon: "reports", permission: "report" },
      { href: "/settings", label: "settings", icon: "settings", permission: "settings" },
    ],
  },
];

/**
 * Filter navigation sections by the caller's permission set.
 * Items without a `permission` are always visible; gated items are dropped when
 * the caller cannot perform the action (fail-closed).
 */
export function visibleNavSections(
  sections: NavSection[],
  can: (action: string) => boolean,
): NavSection[] {
  return sections
    .map((s) => ({
      ...s,
      items: s.items.filter((i) => !i.permission || can(i.permission)),
    }))
    .filter((s) => s.items.length > 0);
}
