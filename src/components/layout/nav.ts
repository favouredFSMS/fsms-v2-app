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
      { href: "/dashboard", label: "Dashboard", icon: "dashboard", permission: "dashboard" },
    ],
  },
  {
    title: "School",
    items: [
      { href: "/people", label: "People", icon: "people", permission: "people" },
      { href: "/students", label: "Students", icon: "students", permission: "students" },
      { href: "/parents", label: "Parents", icon: "parents", permission: "parents" },
      { href: "/classes", label: "Classes", icon: "classes", permission: "classes" },
      // canonical "attendance" lands in Phase 14; attendanceGrid is the current gate
      { href: "/attendance", label: "Attendance", icon: "attendance", permission: "attendanceGrid" },
    ],
  },
  {
    title: "Teaching",
    items: [
      { href: "/homework", label: "Homework", icon: "homework", permission: "homework" },
      // canonical "lessons" lands in Phase 16; lessonCalendar is the current gate
      { href: "/lessons", label: "Lessons", icon: "lessons", permission: "lessonCalendar" },
      { href: "/assessments", label: "Assessments", icon: "assessments", permission: "assessments" },
      { href: "/curriculum", label: "Curriculum", icon: "curriculum", permission: "curriculum" },
      // canonical "materials" lands in Phase 19; materialCatalog is the current gate
      { href: "/materials", label: "Materials", icon: "materials", permission: "materialCatalog" },
      // canonical "ai" lands in Phase 21; aiAsk is the staff gate
      { href: "/ai", label: "AI", icon: "ai", permission: "aiAsk" },
    ],
  },
  {
    title: "Finances",
    items: [
      { href: "/payments", label: "Payments", icon: "payments", permission: "payments" },
      { href: "/payroll", label: "Payroll", icon: "payroll", permission: "payroll" },
    ],
  },
  {
    title: "Communication",
    items: [
      // canonical "messaging" lands in Phase 22; messageConversations is the gate
      { href: "/messaging", label: "Messaging", icon: "messaging", permission: "messageConversations" },
      { href: "/notifications", label: "Notifications", icon: "notifications", permission: "notifications" },
    ],
  },
  {
    title: "Learning",
    items: [
      { href: "/learning", label: "My learning", icon: "learning", permission: "learning" },
      { href: "/family", label: "Family", icon: "family", permission: "familyDashboard" },
    ],
  },
  {
    title: "Administration",
    items: [
      // canonical "reports" lands in Phase 20; the base `report` action is granted
      // to every role, and each report re-checks its own finer permission inside
      // its SECURITY DEFINER RPC.
      { href: "/reports", label: "Reports", icon: "reports", permission: "report" },
      { href: "/roles", label: "Roles", icon: "roles", permission: "roles" },
      { href: "/settings", label: "Settings", icon: "settings", permission: "settings" },
      { href: "/admin", label: "Admin", icon: "admin", permission: "admin" },
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
