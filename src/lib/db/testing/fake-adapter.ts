import type { DbAdapter, DbResult, SelectQuery, WhereOp } from "../adapter";
import { ServiceError } from "../errors";

/**
 * Test helper: a recording, canned-response fake adapter for repository unit
 * tests (no database). Override any method to return canned data.
 */
export type FakeAdapter = DbAdapter & { calls: Array<{ op: string; [k: string]: unknown }> };

export function fakeAdapter(overrides: Partial<DbAdapter> = {}): FakeAdapter {
  const calls: Array<{ op: string; [k: string]: unknown }> = [];
  const base: DbAdapter = {
    async select<T>(q: SelectQuery): Promise<DbResult<T[]>> {
      calls.push({ op: "select", q });
      return { data: [] as T[], error: null };
    },
    async selectOne<T>(q: SelectQuery): Promise<DbResult<T>> {
      calls.push({ op: "selectOne", q });
      return { data: null, error: null };
    },
    async insert(table: string, value: Record<string, unknown>): Promise<DbResult<null>> {
      calls.push({ op: "insert", table, value });
      return { data: null, error: null };
    },
    async update<T>(table: string, value: Record<string, unknown>, where: WhereOp[]): Promise<DbResult<T>> {
      calls.push({ op: "update", table, value, where });
      return { data: null, error: null };
    },
    async remove(table: string, where: WhereOp[]): Promise<DbResult<null>> {
      calls.push({ op: "remove", table, where });
      return { data: null, error: null };
    },
    async rpc<T>(fn: string, args?: Record<string, unknown>): Promise<DbResult<T>> {
      calls.push({ op: "rpc", fn, args });
      return { data: null, error: null };
    },
    ...overrides,
  };
  return Object.assign(base, { calls });
}

export { ServiceError };
