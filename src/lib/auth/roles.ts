/**
 * FSMS V2 — role model (mirrors V101 Auth.gs role groups + ranks).
 *
 * Pure functions, no I/O — unit-tested and reused by the server guards and the
 * client UI for coarse-grained gating. Fine-grained action checks always go
 * through the permission catalog / `fsms.has_perm` (the DB is authoritative).
 */
import { BUILTIN_ROLES, BUILTIN_RANK, ROLE_GROUPS, type RoleKey } from "@/lib/auth/permissions";

export { BUILTIN_ROLES, BUILTIN_RANK };

export const STAFF_ROLES = ROLE_GROUPS.STAFF_ROLES as readonly RoleKey[];
export const LEADERSHIP = ROLE_GROUPS.LEADERSHIP as readonly RoleKey[];
export const MONEY_ROLES = ROLE_GROUPS.MONEY_ROLES as readonly RoleKey[];
export const APPROVAL_ROLES = ROLE_GROUPS.APPROVAL_ROLES as readonly RoleKey[];

export function rankOf(role: RoleKey | null | undefined): number {
  if (!role) return 0;
  return BUILTIN_RANK[role] ?? 0;
}

/** Higher rank = more authority (V101: "who may manage whom"). */
export function outranks(a: RoleKey | null | undefined, b: RoleKey | null | undefined): boolean {
  return rankOf(a) > rankOf(b);
}

export function isSuperuser(role: RoleKey | null | undefined): boolean {
  return role === "admin1";
}

export function isLeadership(role: RoleKey | null | undefined): boolean {
  return role !== null && role !== undefined && LEADERSHIP.includes(role);
}

export function isStaff(role: RoleKey | null | undefined): boolean {
  return role !== null && role !== undefined && STAFF_ROLES.includes(role);
}

/** Office roles (leadership + secretary). */
export function isOffice(role: RoleKey | null | undefined): boolean {
  return isLeadership(role) || role === "secretary";
}

export function isMoneyRole(role: RoleKey | null | undefined): boolean {
  return role !== null && role !== undefined && MONEY_ROLES.includes(role);
}

/** Financial access = money roles + secretary (V101 isFinance). */
export function isFinance(role: RoleKey | null | undefined): boolean {
  return isMoneyRole(role) || role === "secretary";
}

/** Roles that must hold a timed grant before they may write (V101 APPROVAL_ROLES). */
export function needsApproval(role: RoleKey | null | undefined): boolean {
  return role !== null && role !== undefined && APPROVAL_ROLES.includes(role);
}
