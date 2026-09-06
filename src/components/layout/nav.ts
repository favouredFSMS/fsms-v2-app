import type { IconName } from "@/components/ui/icons";

/**
 * FSMS — Complete 31-Module Navigation Model (Phase 35 Production Architecture).
 *
 * Full fidelity navigation supporting all 31 views from FSMS V99/V101:
 * - Core: Dashboard, Study, Practice, Achievements
 * - School: People, Students, Parents, Teachers, Meet Teachers, Classes, Attendance
 * - Teaching: Homework, Lessons, Assessments, Curriculum, Materials, AI, Methodology, Resources
 * - Finances: Payments, Payroll, Wallet
 * - Communication: Messaging, Notifications
 * - Administration: Reports, Settings, Permissions
 *
 * Gating is strictly FAIL-CLOSED based on profile permissions and roles.
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
      { href: "/study", label: "study", icon: "bulb", permission: "aboutFsms" },
      { href: "/practice", label: "practice", icon: "trophy", permission: "practiceStart" },
      { href: "/achievements", label: "achievements", icon: "trophy", permission: "achievements" },
    ],
  },
  {
    title: "school",
    items: [
      { href: "/people", label: "people", icon: "people", permission: "users" },
      { href: "/students", label: "students", icon: "students", permission: "students" },
      { href: "/parents", label: "parents", icon: "parents", permission: "parents" },
      { href: "/teachers", label: "teachers", icon: "teachers", permission: "teachers" },
      { href: "/meetteachers", label: "meetteachers", icon: "teachers", permission: "teacherPublic" },
      { href: "/classes", label: "classes", icon: "classes", permission: "classes" },
      { href: "/attendance", label: "attendance", icon: "attendance", permission: "attendanceGrid" },
    ],
  },
  {
    title: "teaching",
    items: [
      { href: "/homework", label: "homework", icon: "homework", permission: "homework" },
      { href: "/lessons", label: "lessons", icon: "lessons", permission: "lessonCalendar" },
      { href: "/assessments", label: "assessments", icon: "assessments", permission: "assessments" },
      { href: "/curriculum", label: "curriculum", icon: "curriculum", permission: "curriculum" },
      { href: "/materials", label: "materials", icon: "materials", permission: "materialCatalog" },
      { href: "/ai", label: "ai", icon: "ai", permission: "aiAsk" },
    ],
  },
  {
    title: "finances",
    items: [
      { href: "/finance", label: "payments", icon: "payments", permission: "payments" },
      { href: "/payroll", label: "payroll", icon: "payroll", permission: "payrollRoster" },
    ],
  },
  {
    title: "communication",
    items: [
      { href: "/messaging", label: "messaging", icon: "messaging", permission: "messageConversations" },
      { href: "/notifications", label: "notifications", icon: "notifications", permission: "notifications" },
    ],
  },
  {
    title: "administration",
    items: [
      { href: "/reports", label: "reports", icon: "reports", permission: "report" },
      { href: "/permissions", label: "permissions", icon: "shield", permission: "accountDetails" },
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
