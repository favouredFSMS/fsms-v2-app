import type { ReactNode } from "react";

/**
 * FSMS V2 — inline icon set (24×24, stroke = currentColor).
 * Self-contained SVGs: no external icon dependency, works offline.
 */
export type IconName =
  | "dashboard" | "people" | "students" | "parents" | "classes" | "attendance"
  | "homework" | "lessons" | "assessments" | "curriculum" | "materials"
  | "payments" | "payroll" | "messaging" | "notifications" | "learning"
  | "family" | "reports" | "roles" | "settings" | "admin"
  | "search" | "close" | "check" | "chevron-left" | "chevron-right"
  | "chevron-down" | "menu" | "bell" | "logout" | "user" | "filter"
  | "calendar" | "inbox" | "info" | "success" | "warning" | "danger" | "plus";

const P: Record<IconName, ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8" />
      <path d="M17.5 14.4a5.5 5.5 0 0 1 3 5.6" />
    </>
  ),
  students: (
    <>
      <path d="M12 4 3 8l9 4 9-4-9-4Z" />
      <path d="M6 10.5V15c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5" />
      <path d="M21 8v5" />
    </>
  ),
  parents: (
    <>
      <circle cx="7" cy="7" r="3" />
      <circle cx="17" cy="7" r="3" />
      <path d="M2.5 19a4.5 4.5 0 0 1 9 0" />
      <path d="M12.5 19a4.5 4.5 0 0 1 9 0" />
      <path d="M12 13.5a3 3 0 0 1 3-2.5" />
    </>
  ),
  classes: (
    <>
      <rect x="3" y="4" width="18" height="15" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 6h6" />
      <path d="M9 13h6" />
    </>
  ),
  attendance: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
      <path d="M8 3v2M16 3v2" />
      <path d="m9.5 14.5 1.8 1.8 3.4-3.4" />
    </>
  ),
  homework: (
    <>
      <path d="M7 3h8l4 4v14H7z" />
      <path d="M15 3v4h4" />
      <path d="M10 12h6M10 16h6" />
    </>
  ),
  lessons: (
    <>
      <path d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z" />
      <path d="M12 8v4l3 2" />
    </>
  ),
  assessments: (
    <>
      <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" />
      <path d="M9 15l3-3 3 3 6-6" />
      <path d="M17 9h4v4" />
    </>
  ),
  curriculum: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <path d="M4 5.5v15" />
      <path d="M8 8h8M8 12h8" />
    </>
  ),
  materials: (
    <>
      <path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" />
      <path d="m4 7 8 4 8-4" />
      <path d="M12 11v10" />
    </>
  ),
  payments: (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M2.5 10h19" />
      <path d="M6 15h4" />
    </>
  ),
  payroll: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20a7 7 0 0 1 14 0" />
      <path d="M12 4V2M15 4.6l1.5-1.5M9 4.6 7.5 3.1" />
    </>
  ),
  messaging: (
    <>
      <path d="M21 12a8 8 0 0 1-8 8H5l-2 2V12a8 8 0 0 1 8-8h2a8 8 0 0 1 8 8Z" />
      <path d="M9 10h.01M12 10h.01M15 10h.01" />
    </>
  ),
  notifications: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),
  learning: (
    <>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="M6 11.5V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5" />
      <path d="M21 8v4" />
    </>
  ),
  family: (
    <>
      <path d="M12 7a4 4 0 1 0-4-4" />
      <path d="M16 7a4 4 0 1 1 4-4" />
      <path d="M3 19a6 6 0 0 1 12 0" />
      <path d="M15 19a6 6 0 0 1 6-6" />
    </>
  ),
  reports: (
    <>
      <path d="M4 4h16v16H4z" />
      <path d="M8 16v-3M12 16V8M16 16v-5" />
    </>
  ),
  roles: (
    <>
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 12a7 7 0 0 0-.15-1.4l2-1.55-2-3.46-2.36.95a7 7 0 0 0-2.42-1.4L13.7 2.6h-3.4l-.37 2.54a7 7 0 0 0-2.42 1.4l-2.36-.95-2 3.46 2 1.55A7 7 0 0 0 5 12c0 .48.05.95.15 1.4l-2 1.55 2 3.46 2.36-.95a7 7 0 0 0 2.42 1.4l.37 2.54h3.4l.37-2.54a7 7 0 0 0 2.42-1.4l2.36.95 2-3.46-2-1.55c.1-.45.15-.92.15-1.4Z" />
    </>
  ),
  admin: (
    <>
      <path d="M12 3 4 6v6c0 4.5 3.4 7.6 8 9 4.6-1.4 8-4.5 8-9V6l-8-3Z" />
      <path d="M12 8v4" />
      <path d="M12 15h.01" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="m5 12 4.5 4.5L19 7" />,
  "chevron-left": <path d="m15 5-7 7 7 7" />,
  "chevron-right": <path d="m9 5 7 7-7 7" />,
  "chevron-down": <path d="m6 9 6 6 6-6" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  bell: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),
  logout: (
    <>
      <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" />
      <path d="M10 8l-4 4 4 4" />
      <path d="M6 12h10" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </>
  ),
  filter: (
    <>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  inbox: (
    <>
      <path d="M4 4h16v16H4z" />
      <path d="M4 14h4l2 2h4l2-2h4" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </>
  ),
  success: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </>
  ),
  warning: (
    <>
      <path d="M12 4 2.5 20h19L12 4Z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </>
  ),
  danger: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6" />
      <path d="M12 16h.01" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
};

export interface IconProps {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function Icon({ name, size = 20, strokeWidth = 1.8, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {P[name]}
    </svg>
  );
}
