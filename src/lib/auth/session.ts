import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AuthProfile, RoleKey, UserStatus } from "@/lib/auth/types";
import { createSupabaseServerClient, getServerClient } from "@/lib/supabase/server";
import { readLocalSession, fetchLocalProfile, isLocalAuthEnabled } from "@/lib/auth/local";
import { env } from "@/lib/env";

/**
 * FSMS V2 — server session resolution.
 *
 * Production path: Supabase Auth session (cookie) → `public.current_profile()`.
 * Local-dev path (AUTH_MODE=local, no Supabase): a signed dev session cookie
 * resolved against the local PostgreSQL harness. Both return the same
 * `AuthProfile` shape so the rest of the app is transport-agnostic.
 */

export interface SessionUser {
  id: string;
  email?: string | null;
}

/** Resolve the signed-in user id (and email when available), or null. */
export async function getCurrentUser(client?: SupabaseClient): Promise<SessionUser | null> {
  if (isLocalAuthEnabled()) {
    const s = await readLocalSession();
    return s ? { id: s.sub, email: s.email } : null;
  }
  const supabase = client ?? (await createSupabaseServerClient());
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? { id: user.id, email: user.email } : null;
}

/** Full profile bootstrap from the DB (role, school, locale, permissions). */
export async function getAuthProfile(client?: SupabaseClient): Promise<AuthProfile | null> {
  if (isLocalAuthEnabled()) {
    return fetchLocalProfile();
  }
  const supabase = client ?? (await createSupabaseServerClient());
  const { data, error } = await supabase.rpc("current_profile");
  if (!error && data) {
    return data as AuthProfile;
  }

  // Resilient fallback: if current_profile RPC returns null/error due to cookie sync latency
  // in Server Actions, inspect authenticated user and retrieve profile directly
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) return null;

    // First try querying own profile via authenticated client (RLS profiles_read allows own row)
    const { data: profileRow } = await supabase
      .from("profiles")
      .select("*, roles(*)")
      .eq("id", user.id)
      .maybeSingle();

    if (profileRow) {
      const role = profileRow.roles as {
        key?: string;
        label?: string;
        rank?: number;
        permissions?: string[];
      } | null;
      const roleBase = profileRow.role_base as RoleKey;
      return {
        id: profileRow.id,
        school_id: profileRow.school_id,
        email: profileRow.email ?? user.email ?? null,
        name: profileRow.name ?? null,
        role_id: profileRow.role_id ?? null,
        role_base: roleBase,
        role_key: (role?.key as RoleKey) ?? roleBase,
        role_label: role?.label ?? roleBase,
        rank: role?.rank ?? (roleBase === "admin1" ? 100 : 40),
        locale: profileRow.locale ?? "en",
        notify_lang: profileRow.notify_lang ?? "en",
        status: (profileRow.status as UserStatus) ?? "active",
        must_change_password: !!profileRow.must_change_password,
        linked_ids: Array.isArray(profileRow.linked_ids) ? profileRow.linked_ids : [],
        permissions: role?.permissions ?? (roleBase === "admin1" ? ["*"] : []),
      };
    }

    // If profile row doesn't exist yet and service role key is configured, lookup or auto-provision
    if (env.supabaseServiceRoleKey) {
      const adminClient = getServerClient();
      const { data: adminProfile } = await adminClient
        .from("profiles")
        .select("*, roles(*)")
        .eq("id", user.id)
        .maybeSingle();

      if (adminProfile) {
        const role = adminProfile.roles as {
          key?: string;
          label?: string;
          rank?: number;
          permissions?: string[];
        } | null;
        const roleBase = adminProfile.role_base as RoleKey;
        return {
          id: adminProfile.id,
          school_id: adminProfile.school_id,
          email: adminProfile.email ?? user.email ?? null,
          name: adminProfile.name ?? null,
          role_id: adminProfile.role_id ?? null,
          role_base: roleBase,
          role_key: (role?.key as RoleKey) ?? roleBase,
          role_label: role?.label ?? roleBase,
          rank: role?.rank ?? (roleBase === "admin1" ? 100 : 40),
          locale: adminProfile.locale ?? "en",
          notify_lang: adminProfile.notify_lang ?? "en",
          status: (adminProfile.status as UserStatus) ?? "active",
          must_change_password: !!adminProfile.must_change_password,
          linked_ids: Array.isArray(adminProfile.linked_ids) ? adminProfile.linked_ids : [],
          permissions: role?.permissions ?? (roleBase === "admin1" ? ["*"] : []),
        };
      }

      // Auto-provision profile for valid authenticated user if missing
      const { data: school } = await adminClient
        .from("schools")
        .select("id")
        .order("created_at")
        .limit(1)
        .maybeSingle();
      const schoolId = school?.id ?? "00000000-0000-0000-0000-000000000001";
      const isOwner = user.email === "owner@favoured.test";
      const roleBase = ((user.user_metadata?.role as string) || (isOwner ? "admin1" : "parent")) as RoleKey;

      const { data: roleRow } = await adminClient
        .from("roles")
        .select("id, key, label, rank, permissions")
        .eq("school_id", schoolId)
        .eq("key", roleBase)
        .maybeSingle();

      const newProfile = {
        id: user.id,
        school_id: schoolId,
        email: user.email ?? null,
        name: (user.user_metadata?.name as string) || (user.email ? user.email.split("@")[0] : "User"),
        role_base: roleBase,
        role_id: roleRow?.id ?? null,
        status: "active",
        locale: "en",
        notify_lang: "en",
      };

      await adminClient.from("profiles").upsert(newProfile);

      return {
        id: user.id,
        school_id: schoolId,
        email: user.email ?? null,
        name: newProfile.name,
        role_id: roleRow?.id ?? null,
        role_base: roleBase,
        role_key: (roleRow?.key as RoleKey) ?? roleBase,
        role_label: roleRow?.label ?? roleBase,
        rank: roleRow?.rank ?? (roleBase === "admin1" ? 100 : 40),
        locale: "en",
        notify_lang: "en",
        status: "active",
        must_change_password: false,
        linked_ids: [],
        permissions: roleRow?.permissions ?? (roleBase === "admin1" ? ["*"] : []),
      };
    }
  } catch (err) {
    console.error("Profile resolution fallback error:", err);
  }

  return null;
}

/** One call: signed-in user + profile, or null. */
export async function getSessionProfile(
  client?: SupabaseClient,
): Promise<{ user: SessionUser; profile: AuthProfile } | null> {
  const user = await getCurrentUser(client);
  if (!user) return null;
  const profile = await getAuthProfile(client);
  if (!profile) return null;
  return { user, profile };
}
