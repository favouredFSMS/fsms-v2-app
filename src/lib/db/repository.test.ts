import { describe, expect, it } from "vitest";
import { StudentRepository } from "./repos/students";
import { Repository } from "./repository";
import { ServiceError } from "./errors";
import type { DbAdapter, DbResult, SelectQuery, WhereOp } from "./adapter";
import type { DbContext } from "./context";
import type { AuthProfile } from "@/lib/auth/types";

const profile = (over: Partial<AuthProfile> = {}): AuthProfile => ({
  id: "u1",
  school_id: "s1",
  email: null,
  name: null,
  role_id: null,
  role_base: "teacher",
  role_key: "teacher",
  role_label: "Teacher",
  rank: 50,
  locale: "en",
  notify_lang: "en",
  status: "active",
  must_change_password: false,
  linked_ids: [],
  permissions: ["dashboard", "saveHomework"],
  ...over,
});

/** Minimal recording fake that returns canned responses. */
function fakeAdapter(over: Partial<DbAdapter> = {}): DbAdapter & { calls: unknown[] } {
  const calls: unknown[] = [];
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
      return { data: value as T, error: null };
    },
    async remove(table: string, where: WhereOp[]): Promise<DbResult<null>> {
      calls.push({ op: "remove", table, where });
      return { data: null, error: null };
    },
    async rpc<T>(fn: string, args?: Record<string, unknown>): Promise<DbResult<T>> {
      calls.push({ op: "rpc", fn, args });
      return { data: null, error: null };
    },
    ...over,
  };
  return Object.assign(base, { calls });
}

const ctx = (adapter: DbAdapter, p: AuthProfile = profile()): DbContext => ({
  profile: p,
  db: adapter,
});

describe("StudentRepository.search", () => {
  it("rejects invalid filters before touching the database", async () => {
    const adapter = fakeAdapter();
    const repo = new StudentRepository(ctx(adapter));
    const res = await repo.search({ pageSize: 9999 });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("invalid_input");
    expect(adapter.calls).toHaveLength(0);
  });

  it("passes named args to the RPC and maps rows to a page", async () => {
    const adapter = fakeAdapter({
      async rpc<T>(fn: string, args?: Record<string, unknown>): Promise<DbResult<T>> {
        (adapter as unknown as { calls: unknown[] }).calls.push({ op: "rpc", fn, args });
        return {
          data: {
            rows: [{ id: "s1", name: "Anna", student_no: "S-001", level_code: "a2", status: "active" }],
            total: 1,
            next_cursor: null,
          } as T,
          error: null,
        };
      },
    });
    const repo = new StudentRepository(ctx(adapter));
    const res = await repo.search({ search: "anna", pageSize: 20 });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.total).toBe(1);
    expect(res.data.items[0].name).toBe("Anna");
    expect(res.data.nextCursor).toBeNull();
  });

  it("surfaces adapter errors as the error envelope", async () => {
    const adapter = fakeAdapter({
      rpc: async () => ({ data: null, error: new ServiceError("forbidden", 403, "denied") }),
    });
    const res = await new StudentRepository(ctx(adapter)).search({});
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("forbidden");
  });
});

describe("StudentRepository.create", () => {
  it("fails closed when the caller lacks saveStudent", async () => {
    const adapter = fakeAdapter();
    const repo = new StudentRepository(ctx(adapter, profile({ permissions: ["dashboard"] })));
    const res = await repo.create({ name: "Anna" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("forbidden");
    expect(adapter.calls).toHaveLength(0);
  });

  it("inserts with the caller's school_id and the validated fields", async () => {
    const adapter = fakeAdapter();
    const owner = profile({ role_base: "admin1", permissions: ["*"], school_id: "s1" });
    const repo = new StudentRepository(ctx(adapter, owner));
    const res = await repo.create({ name: "Anna", student_no: "S-999" });
    expect(res.ok).toBe(true);
    const insert = adapter.calls.find((c) => (c as { op: string }).op === "insert") as {
      value: Record<string, unknown>;
    };
    expect(insert.value).toMatchObject({ name: "Anna", student_no: "S-999", school_id: "s1" });
  });

  it("validates before authorizing/inserting", async () => {
    const adapter = fakeAdapter();
    const repo = new StudentRepository(ctx(adapter, profile({ role_base: "admin1", permissions: ["*"] })));
    const res = await repo.create({ name: "" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("invalid_input");
    expect(adapter.calls).toHaveLength(0);
  });
});

describe("Repository base", () => {
  it("can() returns a forbidden error for missing permissions", () => {
    class R extends Repository {
      check(action: string) {
        return this.can(action);
      }
    }
    const r = new R(ctx(fakeAdapter()));
    expect(r.check("saveStudent")?.code).toBe("forbidden");
    expect(r.check("dashboard")).toBeNull();
  });
});
