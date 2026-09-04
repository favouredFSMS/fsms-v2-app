/**
 * FSMS V2 — auth domain types.
 *
 * `AuthProfile` mirrors the `fsms.current_profile()` bootstrap JSON — a single
 * server-resolved snapshot of who the caller is, where they belong, and what
 * they may do. The client NEVER constructs this from its own claims.
 */
import type { RoleKey } from "@/lib/auth/permissions";

export type { RoleKey, PermissionAction } from "@/lib/auth/permissions";

export type UserStatus = "active" | "pending" | "blocked" | "deactivated";

export interface AuthProfile {
  id: string;
  school_id: string;
  email: string | null;
  name: string | null;
  role_id: string | null;
  role_base: RoleKey;
  role_key: RoleKey | null; // custom role key, else the built-in key
  role_label: string | null;
  rank: number;
  locale: string; // per-user UI language (never global) — Phase 24 wires it to next-intl
  notify_lang: string; // per-user email language
  status: UserStatus;
  must_change_password: boolean;
  linked_ids: string[];
  permissions: string[]; // admin1 → ["*"]
}
