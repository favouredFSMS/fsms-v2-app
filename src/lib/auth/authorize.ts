/**
 * FSMS V2 — authorization decision helpers (mirror V101 roleAllows_ / scoping).
 *
 * Pure and fast, for UI gating and pre-flight checks. The authoritative gate is
 * always the database (`fsms.has_perm`, RLS) — these helpers must never be the
 * ONLY enforcement for a sensitive action.
 */
import { PERMISSION_CATALOG, type PermissionAction, type RoleKey } from "@/lib/auth/permissions";
import { rankOf, outranks } from "@/lib/auth/roles";
import type { AuthProfile } from "@/lib/auth/types";

export interface Principal {
  role_base: RoleKey | null;
  permissions?: string[];
}

/** True when the role/principal may call the action (V101 roleAllows_). */
export function hasPermission(principal: Principal | null | undefined, action: string): boolean {
  if (!principal) return false;
  if (principal.role_base === "admin1") return true; // owner wildcard
  const perms = principal.permissions ?? [];
  return perms.includes("*") || perms.includes(action);
}

/** Convenience for the resolved profile shape. */
export function profileCan(profile: AuthProfile | null, action: PermissionAction | string): boolean {
  return hasPermission(
    profile ? { role_base: profile.role_base, permissions: profile.permissions } : null,
    action,
  );
}

/** Which roles the shipped catalog permits for an action (documentation + tests). */
export function allowedRolesFor(action: string): RoleKey[] {
  const entry = PERMISSION_CATALOG[action as PermissionAction];
  return entry ? [...entry.roles] : [];
}

/** A principal may manage a target profile when they strictly outrank them (V101 rankOf_). */
export function canManage(actor: Principal | null | undefined, targetRole: RoleKey | null | undefined): boolean {
  if (!actor) return false;
  if (actor.role_base === "admin1") return true;
  return outranks(actor.role_base, targetRole);
}

/** Rank of the actor, for "who may manage whom" comparisons. */
export function actorRank(actor: Principal | null | undefined): number {
  return rankOf(actor?.role_base ?? null);
}
