import "server-only";
import { redirect } from "next/navigation";
import { getAuthProfile } from "@/lib/auth/session";
import { profileCan } from "@/lib/auth/authorize";
import { isLeadership, isStaff, isFinance, isMoneyRole, isSuperuser } from "@/lib/auth/roles";
import type { AuthProfile } from "@/lib/auth/types";

/**
 * FSMS V2 — server-side authorization guards.
 *
 * Fails CLOSED: a missing/inactive profile is treated as anonymous, and a
 * missing permission is always denied. These run before any sensitive handler.
 * The database (RLS + fsms.has_perm) remains the final enforcement layer.
 */

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: 401 | 403,
  ) {
    super(message);
  }
}

/** Resolve the profile, or redirect to login (pages) / throw (handlers). */
export async function requireProfile(): Promise<AuthProfile> {
  const profile = await getAuthProfile();
  if (!profile) {
    throw new AuthError("Not authenticated", 401);
  }
  if (profile.status !== "active") {
    throw new AuthError("Account is not active", 403);
  }
  return profile;
}

/** Redirect to /login when anonymous (for Server Components / pages). */
export async function requireUser(): Promise<AuthProfile> {
  const profile = await getAuthProfile();
  if (!profile) redirect("/login");
  if (profile.status !== "active") redirect("/login?reason=inactive");
  return profile;
}

export async function requirePermission(action: string): Promise<AuthProfile> {
  const profile = await requireProfile();
  if (!profileCan(profile, action)) {
    throw new AuthError(`Forbidden: missing permission "${action}"`, 403);
  }
  return profile;
}

export async function requireRole(predicate: (p: AuthProfile) => boolean): Promise<AuthProfile> {
  const profile = await requireProfile();
  if (!predicate(profile)) {
    throw new AuthError("Forbidden: role not allowed", 403);
  }
  return profile;
}

// Convenience role guards (thin wrappers over the pure role helpers).
export const requireLeadership = () => requireRole((p) => isLeadership(p.role_base));
export const requireStaff = () => requireRole((p) => isStaff(p.role_base));
export const requireFinance = () => requireRole((p) => isFinance(p.role_base));
export const requireMoneyRole = () => requireRole((p) => isMoneyRole(p.role_base));
export const requireOwner = () => requireRole((p) => isSuperuser(p.role_base));
