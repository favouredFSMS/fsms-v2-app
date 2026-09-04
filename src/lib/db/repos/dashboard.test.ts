import { describe, expect, it } from "vitest";
import { DashboardRepository } from "./dashboard";
import type { DbAdapter, DbResult, SelectQuery, WhereOp } from "../adapter";
import type { DbContext } from "../context";
import type { AuthProfile } from "@/lib/auth/types";

const profile = (): AuthProfile => ({
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
  permissions: ["dashboard"],
});

function fakeAdapter(rpcData: unknown): DbAdapter {
  return {
    async select<T>(q: SelectQuery): Promise<DbResult<T[]>> { void q; return { data: [], error: null }; },
    async selectOne<T>(q: SelectQuery): Promise<DbResult<T>> { void q; return { data: null, error: null }; },
    async insert(t: string, v: Record<string, unknown>): Promise<DbResult<null>> { void t; void v; return { data: null, error: null }; },
    async update<T>(t: string, v: Record<string, unknown>, w: WhereOp[]): Promise<DbResult<T>> { void t; void v; void w; return { data: null, error: null }; },
    async remove(t: string, w: WhereOp[]): Promise<DbResult<null>> { void t; void w; return { data: null, error: null }; },
    async rpc<T>(fn: string): Promise<DbResult<T>> {
      expect(fn).toBe("dashboard_summary");
      return { data: rpcData as T, error: null };
    },
  };
}

describe("DashboardRepository.summary", () => {
  it("normalizes a full RPC payload", async () => {
    const ctx: DbContext = { profile: profile(), db: fakeAdapter({
      role: "teacher",
      role_label: "Teacher",
      counts: { students: 3, teachers: 1, parents: 1, classes: 1 },
      myClasses: [{ id: "c1", name: "A2", level_code: "a2", students: 2 }],
    }) };
    const res = await new DashboardRepository(ctx).summary();
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.role).toBe("teacher");
    expect(res.data.counts?.students).toBe(3);
    expect(res.data.myClasses[0].name).toBe("A2");
  });

  it("defaults missing sections to empty/null-safe values", async () => {
    const ctx: DbContext = { profile: profile(), db: fakeAdapter({ role: "parent" }) };
    const res = await new DashboardRepository(ctx).summary();
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.myClasses).toEqual([]);
    expect(res.data.counts).toBeNull();
    expect(res.data.myChildren).toEqual([]);
  });
});
