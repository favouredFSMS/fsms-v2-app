import { profileCan } from "@/lib/auth/authorize";
import type { DbContext } from "./context";
import type { SelectQuery } from "./adapter";
import { fail, mapDbError, ok, ServiceError, type ServiceResult } from "./errors";

/**
 * FSMS V2 — repository base class (Phase 10).
 *
 * Repositories are the ONLY modules allowed to touch the database (ADR-10).
 * They expose typed methods returning the `ServiceResult` envelope and enforce
 * two layers of authorization:
 *
 *   1. RBAC pre-check  — `can()` / `assertCan()` against the V101 catalog
 *      (fail-fast, user-safe error), and
 *   2. RLS post-check   — the user-scoped adapter always runs as the caller,
 *      so the database re-checks every row on every query (defense in depth).
 */
export abstract class Repository {
  constructor(protected readonly ctx: DbContext) {}

  /** RBAC pre-check: returns a ServiceError if the caller lacks the action. */
  protected can(action: string): ServiceError | null {
    if (!profileCan(this.ctx.profile, action)) {
      return new ServiceError("forbidden", 403, `Missing permission "${action}"`);
    }
    return null;
  }

  /** RBAC pre-check that throws (for callers that prefer exceptions). */
  protected assertCan(action: string): void {
    const denied = this.can(action);
    if (denied) throw denied;
  }

  // ── shared query wrappers (centralize error handling — no duplication) ────

  protected async read<T>(q: SelectQuery): Promise<ServiceResult<T[]>> {
    try {
      const { data, error } = await this.ctx.db.select<T>(q);
      if (error) return fail(error);
      return ok(data ?? []);
    } catch (e) {
      return fail(mapDbError(e));
    }
  }

  protected async readOne<T>(q: SelectQuery): Promise<ServiceResult<T | null>> {
    try {
      const { data, error } = await this.ctx.db.selectOne<T>(q);
      if (error) return fail(error);
      return ok(data);
    } catch (e) {
      return fail(mapDbError(e));
    }
  }

  protected async insertRow(
    table: string,
    value: Record<string, unknown>,
    requiredAction?: string,
  ): Promise<ServiceResult<null>> {
    if (requiredAction) {
      const denied = this.can(requiredAction);
      if (denied) return fail(denied);
    }
    try {
      const { error } = await this.ctx.db.insert(table, value);
      if (error) return fail(error);
      return ok(null);
    } catch (e) {
      return fail(mapDbError(e));
    }
  }

  protected async updateRow<T>(
    table: string,
    value: Record<string, unknown>,
    where: SelectQuery["where"] = [],
    requiredAction?: string,
  ): Promise<ServiceResult<T | null>> {
    if (requiredAction) {
      const denied = this.can(requiredAction);
      if (denied) return fail(denied);
    }
    try {
      const { data, error } = await this.ctx.db.update<T>(table, value, where ?? []);
      if (error) return fail(error);
      return ok(data);
    } catch (e) {
      return fail(mapDbError(e));
    }
  }
}
