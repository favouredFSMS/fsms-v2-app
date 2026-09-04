import { Client } from "pg";
import { env } from "@/lib/env";
import type { DbAdapter, DbResult, SelectQuery, WhereOp } from "./adapter";
import { mapDbError, ServiceError } from "./errors";

/**
 * FSMS V2 — local PostgreSQL adapter (Phase 10, dev harness only).
 *
 * Speaks to the bare-PostgreSQL dev sandbox. Every call impersonates the
 * signed-in user in a single transaction:
 *
 *   begin → set request.jwt.claim.sub → set local role authenticated → query → rollback
 *
 * so the SAME RLS policies that protect Supabase protect local dev too —
 * the adapter is the "withCheck RLS on every query path" guarantee in local
 * mode. Never used in production (fail-closed to Supabase).
 *
 * Identifiers (table/column names) are whitelist-validated; values are always
 * bound parameters (never string-interpolated).
 */

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

function ident(name: string, kind: string): string {
  if (!IDENT.test(name)) {
    throw new ServiceError("invalid_identifier", 500, `Illegal ${kind} name: ${name}`);
  }
  return name;
}

/** Known RPCs and their positional argument order (named → positional map). */
const RPC_ARG_ORDER: Record<string, string[]> = {
  student_search: ["p_search", "p_level", "p_status", "p_page_size", "p_cursor"],
};

export class PgAdapter implements DbAdapter {
  constructor(private readonly sub: string) {}

  private async withClient<T>(fn: (c: Client) => Promise<T>): Promise<T> {
    const client = new Client({ connectionString: env.localDbUrl });
    await client.connect();
    try {
      await client.query("begin");
      try {
        await client.query("select set_config('request.jwt.claim.sub', $1, true)", [this.sub]);
        await client.query("set local role authenticated");
        return await fn(client);
      } finally {
        // COMMIT (not rollback): writes must persist in the dev harness. The
        // transaction-scoped claim/role settings evaporate on commit either way.
        await client.query("commit");
      }
    } finally {
      await client.end();
    }
  }

  // ── SQL building (parameterized) ──────────────────────────────────────────

  private whereSql(w: WhereOp[], params: unknown[]): string {
    if (w.length === 0) return "";
    const clauses = w.map((c) => {
      const col = ident(c.column, "column");
      switch (c.op) {
        case "eq": params.push(c.value); return `${col} = $${params.length}`;
        case "neq": params.push(c.value); return `${col} <> $${params.length}`;
        case "gt": params.push(c.value); return `${col} > $${params.length}`;
        case "gte": params.push(c.value); return `${col} >= $${params.length}`;
        case "lt": params.push(c.value); return `${col} < $${params.length}`;
        case "lte": params.push(c.value); return `${col} <= $${params.length}`;
        case "is":
          params.push(c.value);
          return c.value === null ? `${col} is null` : `${col} is ${c.value ? "true" : "false"}`;
        case "ilike": params.push(c.value); return `${col} ilike $${params.length}`;
        case "in":
          if (c.values.length === 0) return "false";
          c.values.forEach((v) => params.push(v));
          return `${col} in (${c.values.map((_, i) => `$${params.length - c.values.length + i + 1}`).join(", ")})`;
      }
    });
    return `where ${clauses.join(" and ")}`;
  }

  private orderSql(o: SelectQuery["orderBy"]): string {
    if (!o || o.length === 0) return "";
    const parts = o.map(
      (x) => `${ident(x.column, "column")} ${x.ascending === false ? "desc" : "asc"}`,
    );
    return `order by ${parts.join(", ")}`;
  }

  // ── DbAdapter ─────────────────────────────────────────────────────────────

  async select<T>(q: SelectQuery): Promise<DbResult<T[]>> {
    try {
      const table = ident(q.table, "table");
      const cols = q.columns === "*" || !q.columns ? "*" : q.columns;
      const params: unknown[] = [];
      const sql =
        `select ${cols} from public.${table} ` +
        `${this.whereSql(q.where ?? [], params)} ${this.orderSql(q.orderBy)} ` +
        (q.limit != null ? `limit ${Math.max(1, Math.floor(q.limit))} ` : "") +
        (q.offset != null ? `offset ${Math.max(0, Math.floor(q.offset))}` : "");
      const rows = await this.withClient((c) => c.query(sql, params));
      return { data: rows.rows as T[], error: null };
    } catch (e) {
      return { data: [], error: mapDbError(e) };
    }
  }

  async selectOne<T>(q: SelectQuery): Promise<DbResult<T>> {
    const res = await this.select<T>({ ...q, limit: 1 });
    if (res.error) return { data: null, error: res.error };
    return { data: res.data?.[0] ?? null, error: null };
  }

  async insert(table: string, value: Record<string, unknown>): Promise<DbResult<null>> {
    try {
      const t = ident(table, "table");
      const cols = Object.keys(value);
      const params: unknown[] = cols.map((c) => value[c]);
      const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
      // No RETURNING: on RLS-protected tables the read policy (e.g. a
      // self-visibility predicate) may not see the brand-new row, which would
      // spuriously fail the insert. Callers read back via select() when needed.
      const sql = `insert into public.${t} (${cols.map((c) => ident(c, "column")).join(", ")}) values (${placeholders})`;
      await this.withClient((c) => c.query(sql, params));
      return { data: null, error: null };
    } catch (e) {
      return { data: null, error: mapDbError(e) };
    }
  }

  async update<T>(
    table: string,
    value: Record<string, unknown>,
    where: WhereOp[],
  ): Promise<DbResult<T>> {
    try {
      const t = ident(table, "table");
      const params: unknown[] = [];
      const sets = Object.keys(value).map((c) => {
        params.push(value[c]);
        return `${ident(c, "column")} = $${params.length}`;
      });
      const whereClause = this.whereSql(where, params);
      const sql = `update public.${t} set ${sets.join(", ")} ${whereClause} returning *`;
      const res = await this.withClient((c) => c.query(sql, params));
      return { data: (res.rows[0] as T) ?? null, error: null };
    } catch (e) {
      return { data: null, error: mapDbError(e) };
    }
  }

  async remove(table: string, where: WhereOp[]): Promise<DbResult<null>> {
    try {
      const t = ident(table, "table");
      const params: unknown[] = [];
      const sql = `delete from public.${t} ${this.whereSql(where, params)}`;
      await this.withClient((c) => c.query(sql, params));
      return { data: null, error: null };
    } catch (e) {
      return { data: null, error: mapDbError(e) };
    }
  }

  async rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<DbResult<T>> {
    try {
      const order = RPC_ARG_ORDER[fn];
      if (!order) {
        return {
          data: null,
          error: new ServiceError("unsupported_rpc", 501, `RPC "${fn}" has no local adapter mapping`),
        };
      }
      const params = order.map((k) => args[k] ?? null);
      const placeholders = params.map((_, i) => `$${i + 1}`).join(", ");
      const sql = `select * from fsms.${ident(fn, "function")}(${placeholders})`;
      const res = await this.withClient((c) => c.query(sql, params));
      // functions return a single column (jsonb/…); take the first field of the first row
      const first = res.rows[0];
      const data = first ? (Object.values(first)[0] as T) : null;
      return { data, error: null };
    } catch (e) {
      return { data: null, error: mapDbError(e) };
    }
  }
}
