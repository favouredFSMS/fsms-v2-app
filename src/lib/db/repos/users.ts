import { z } from "zod";
import { Repository } from "../repository";
import { parseOrFail } from "../validate";
import { ok, fail, type ServiceResult } from "../errors";
import type { Page } from "../pagination";
import { peopleSearchSchema, userStatusSchema, type PeopleSearchInput } from "@/lib/schemas/people";

/** FSMS V2 — UserRepository (Phase 12). Accounts / roles / status / permissions. */

export interface UserSummary {
  id: string;
  name: string | null;
  email: string | null;
  role_base: string | null;
  role_key: string | null;
  role_label: string | null;
  status: string | null;
  phone: string | null;
  last_login: string | null;
}

interface UserSearchRpc {
  rows: UserSummary[];
  total: number;
  next_cursor: string | null;
}

const userSearchSchema = peopleSearchSchema.extend({
  role: z.string().trim().max(40).nullish(),
});

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const roleAssignSchema = z.object({
  userId: z.string().regex(UUID_RE, "Invalid id"),
  roleKey: z.string().trim().min(1).max(40),
});

export class UserRepository extends Repository {
  /** Staff-scoped user/account list (search + role filter + keyset). */
  async search(input: unknown): Promise<ServiceResult<Page<UserSummary>>> {
    const parsed = parseOrFail(userSearchSchema, input);
    if (!parsed.ok) return parsed;
    const f: PeopleSearchInput & { role?: string | null } = parsed.data;

    const { data, error } = await this.ctx.db.rpc<UserSearchRpc>("user_search", {
      p_search: f.search ?? null,
      p_role: f.role ?? null,
      p_page_size: f.pageSize,
      p_cursor: f.cursor ?? null,
    });
    if (error) return fail(error);
    const res = data ?? { rows: [], total: 0, next_cursor: null };
    return ok({ items: res.rows, total: res.total, nextCursor: res.next_cursor });
  }

  /** Roles available in this school (office-gated via RLS) for the admin UI. */
  async listRoles(): Promise<ServiceResult<Array<{ key: string; label: string }>>> {
    const res = await this.read<{ key: string; label: string }>({
      table: "roles",
      columns: "key, label",
      orderBy: [{ column: "rank", ascending: true }],
    });
    if (!res.ok) return res;
    return ok(res.data.map((r) => ({ key: r.key, label: r.label })));
  }

  /** Office: change an account's status. */
  async setStatus(input: unknown): Promise<ServiceResult<UserSummary | null>> {
    const parsed = parseOrFail(userStatusSchema, input);
    if (!parsed.ok) return parsed;

    const { data, error } = await this.ctx.db.rpc<UserSummary | null>("set_user_status", {
      p_user: parsed.data.userId,
      p_status: parsed.data.status,
    });
    if (error) return fail(error);
    return ok(data ?? null);
  }

  /** Office: assign a role to an account. */
  async assignRole(input: unknown): Promise<ServiceResult<{ id: string; role_key: string; role_base: string } | null>> {
    const parsed = parseOrFail(roleAssignSchema, input);
    if (!parsed.ok) return parsed;

    const { data, error } = await this.ctx.db.rpc<{ id: string; role_key: string; role_base: string } | null>(
      "assign_user_role",
      { p_user: parsed.data.userId, p_role_key: parsed.data.roleKey },
    );
    if (error) return fail(error);
    return ok(data ?? null);
  }
}
