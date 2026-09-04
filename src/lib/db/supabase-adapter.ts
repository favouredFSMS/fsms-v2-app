import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DbAdapter, DbResult, SelectQuery, WhereOp } from "./adapter";
import { mapDbError } from "./errors";

/**
 * FSMS V2 — Supabase adapter (Phase 10).
 *
 * User-scoped (SSR cookie) client: every query runs as the signed-in user, so
 * RLS (tenant + role scoping) applies on every path — "withCheck" enforcement.
 * The service-role client is deliberately NOT used here; privileged flows will
 * get their own explicit, audited adapter.
 *
 * Because the repository layer works with table names as strings, the typed
 * Supabase client (which keys `from()` on literal table names) cannot be used
 * directly. We narrow the client to the small PostgREST surface below and use
 * that everywhere — one cast at the boundary, fully typed downstream.
 */

interface PostgrestErrorLike {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

interface PostgrestResponseLike {
  data: unknown;
  error: PostgrestErrorLike | null;
}

/** Chainable PostgREST query — the minimal surface this adapter uses. */
interface FilterBuilder {
  select(columns?: string): FilterBuilder;
  insert(values: Record<string, unknown>): FilterBuilder;
  update(values: Record<string, unknown>): FilterBuilder;
  delete(): FilterBuilder;
  eq(column: string, value: unknown): FilterBuilder;
  neq(column: string, value: unknown): FilterBuilder;
  gt(column: string, value: unknown): FilterBuilder;
  gte(column: string, value: unknown): FilterBuilder;
  lt(column: string, value: unknown): FilterBuilder;
  lte(column: string, value: unknown): FilterBuilder;
  in(column: string, values: unknown[]): FilterBuilder;
  is(column: string, value: unknown): FilterBuilder;
  ilike(column: string, value: string): FilterBuilder;
  order(column: string, opts?: { ascending?: boolean }): FilterBuilder;
  limit(count: number): FilterBuilder;
  range(from: number, to: number): FilterBuilder;
  single(): PromiseLike<PostgrestResponseLike>;
  then<TResult = PostgrestResponseLike>(
    onfulfilled?:
      | ((value: PostgrestResponseLike) => TResult | PromiseLike<TResult>)
      | null,
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | null,
  ): PromiseLike<TResult>;
}

interface UntypedClient {
  from(table: string): FilterBuilder;
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<PostgrestResponseLike>;
}

export class SupabaseAdapter implements DbAdapter {
  private clientPromise: Promise<UntypedClient> | null = null;

  private client(): Promise<UntypedClient> {
    if (!this.clientPromise) {
      this.clientPromise = createSupabaseServerClient().then(
        (c) => c as unknown as UntypedClient,
      );
    }
    return this.clientPromise;
  }

  private applyWhere(query: FilterBuilder, w: WhereOp): FilterBuilder {
    switch (w.op) {
      case "eq": return query.eq(w.column, w.value);
      case "neq": return query.neq(w.column, w.value);
      case "gt": return query.gt(w.column, w.value);
      case "gte": return query.gte(w.column, w.value);
      case "lt": return query.lt(w.column, w.value);
      case "lte": return query.lte(w.column, w.value);
      case "in": return query.in(w.column, w.values);
      case "is": return query.is(w.column, w.value);
      case "ilike": return query.ilike(w.column, w.value);
      default: return query;
    }
  }

  async select<T>(q: SelectQuery): Promise<DbResult<T[]>> {
    try {
      const sb = await this.client();
      let query = sb.from(q.table).select(q.columns ?? "*");
      for (const w of q.where ?? []) query = this.applyWhere(query, w);
      for (const o of q.orderBy ?? []) query = query.order(o.column, { ascending: o.ascending ?? true });
      if (q.offset != null) query = query.range(q.offset, q.offset + (q.limit ?? 1000) - 1);
      else if (q.limit != null) query = query.limit(q.limit);
      const res = await query;
      return {
        data: (res.data as T[] | null) ?? [],
        error: res.error ? mapDbError(res.error) : null,
      };
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
      const sb = await this.client();
      // No .select(): PostgREST's INSERT … RETURNING is subject to the SELECT
      // policy, which may not "see" the brand-new row on self-visibility tables.
      // Callers read the row back via select()/selectOne() when they need it.
      const res = await sb.from(table).insert(value);
      return { data: null, error: res.error ? mapDbError(res.error) : null };
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
      const sb = await this.client();
      let query = sb.from(table).update(value);
      for (const w of where) {
        if (w.op === "eq") query = query.eq(w.column, w.value);
        else if (w.op === "in") query = query.in(w.column, w.values);
      }
      const res = await query.select().single();
      return {
        data: (res.data as T | null) ?? null,
        error: res.error ? mapDbError(res.error) : null,
      };
    } catch (e) {
      return { data: null, error: mapDbError(e) };
    }
  }

  async remove(table: string, where: WhereOp[]): Promise<DbResult<null>> {
    try {
      const sb = await this.client();
      let query = sb.from(table).delete();
      for (const w of where) {
        if (w.op === "eq") query = query.eq(w.column, w.value);
        else if (w.op === "in") query = query.in(w.column, w.values);
      }
      const res = await query;
      return { data: null, error: res.error ? mapDbError(res.error) : null };
    } catch (e) {
      return { data: null, error: mapDbError(e) };
    }
  }

  async rpc<T>(fn: string, args?: Record<string, unknown>): Promise<DbResult<T>> {
    try {
      const sb = await this.client();
      const res = await sb.rpc(fn, args ?? {});
      return {
        data: res.data as T | null,
        error: res.error ? mapDbError(res.error) : null,
      };
    } catch (e) {
      return { data: null, error: mapDbError(e) };
    }
  }
}
