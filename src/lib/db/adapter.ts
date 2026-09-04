import type { ServiceError } from "./errors";

/**
 * FSMS V2 — data-access adapter contract (Phase 10).
 *
 * The single, narrow query surface the repository layer is allowed to use.
 * Two implementations exist and behave identically:
 *
 *  - SupabaseAdapter  → supabase-js over PostgREST (RLS via the user's JWT);
 *  - PgAdapter        → plain PostgreSQL in the local dev harness (RLS via
 *                       `set role authenticated` + `request.jwt.claim.sub`).
 *
 * Repositories never speak SQL/supabase-js directly — they go through this
 * interface, which keeps database-access logic in ONE place (no duplication
 * across pages) and lets both modes share the exact same authorization path.
 */

export type WhereOp =
  | { op: "eq"; column: string; value: unknown }
  | { op: "neq"; column: string; value: unknown }
  | { op: "gt"; column: string; value: unknown }
  | { op: "gte"; column: string; value: unknown }
  | { op: "lt"; column: string; value: unknown }
  | { op: "lte"; column: string; value: unknown }
  | { op: "in"; column: string; values: unknown[] }
  | { op: "is"; column: string; value: null | boolean }
  | { op: "ilike"; column: string; value: string };

export interface SelectQuery {
  table: string;
  /** comma-separated column list, or "*" */
  columns?: string;
  where?: WhereOp[];
  orderBy?: Array<{ column: string; ascending?: boolean }>;
  limit?: number;
  offset?: number;
}

export interface DbResult<T> {
  data: T | null;
  error: ServiceError | null;
}

export interface DbAdapter {
  select<T = Record<string, unknown>>(q: SelectQuery): Promise<DbResult<T[]>>;
  selectOne<T = Record<string, unknown>>(q: SelectQuery): Promise<DbResult<T>>;
  /** Insert a row. Returns no row: on RLS-protected tables an `INSERT … RETURNING`
   *  cannot reliably return the new row (the read policy may not "see" it yet),
   *  so callers read the row back through select/selectOne when they need it. */
  insert(table: string, value: Record<string, unknown>): Promise<DbResult<null>>;
  update<T = Record<string, unknown>>(
    table: string,
    value: Record<string, unknown>,
    where: WhereOp[],
  ): Promise<DbResult<T>>;
  remove(table: string, where: WhereOp[]): Promise<DbResult<null>>;
  /** Invoke a database function (RPC) by name with named arguments. */
  rpc<T = unknown>(fn: string, args?: Record<string, unknown>): Promise<DbResult<T>>;
}
