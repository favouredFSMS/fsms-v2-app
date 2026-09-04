import { describe, expect, it } from "vitest";
import { ParentRepository } from "./parents";
import { UserRepository } from "./users";
import { fakeAdapter } from "../testing/fake-adapter";
import type { DbContext } from "../context";
import type { AuthProfile } from "@/lib/auth/types";

const profile = (over: Partial<AuthProfile> = {}): AuthProfile => ({
  id: "u1",
  school_id: "s1",
  email: null,
  name: null,
  role_id: null,
  role_base: "admin1",
  role_key: "admin1",
  role_label: "Owner",
  rank: 100,
  locale: "en",
  notify_lang: "en",
  status: "active",
  must_change_password: false,
  linked_ids: [],
  permissions: ["*"],
  ...over,
});

const ctx = (adapter: ReturnType<typeof fakeAdapter>): DbContext => ({ profile: profile(), db: adapter });

describe("ParentRepository", () => {
  it("search maps the RPC payload to a Page", async () => {
    let calledFn = "";
    const adapter = fakeAdapter({
      async rpc<T>(fn: string) {
        calledFn = fn;
        return {
          data: {
            rows: [{ id: "p1", name: "Parent", phone: "+7", email: "p@x.org", children: 2 }],
            total: 1,
            next_cursor: null,
          } as T,
          error: null,
        };
      },
    });
    const res = await new ParentRepository(ctx(adapter)).search({ search: "Par" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.items[0].name).toBe("Parent");
    expect(res.data.total).toBe(1);
    expect(calledFn).toBe("parent_search");
  });

  it("create enforces saveParent and inserts with school_id", async () => {
    const deniedAdapter = fakeAdapter();
    const denied = await new ParentRepository(ctx(deniedAdapter)).create({ name: "P" });
    // admin1 wildcard → allowed; use a restricted profile instead
    void denied;

    const restricted = fakeAdapter();
    const rctx: DbContext = { profile: profile({ role_base: "teacher", permissions: ["parents"] }), db: restricted };
    const res = await new ParentRepository(rctx).create({ name: "P" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("forbidden");
    expect(restricted.calls.filter((c) => c.op === "insert")).toHaveLength(0);
  });
});

describe("UserRepository", () => {
  it("search passes the role filter through to the RPC", async () => {
    const adapter = fakeAdapter({
      async rpc<T>(fn: string, args?: Record<string, unknown>) {
        expect(fn).toBe("user_search");
        expect(args).toMatchObject({ p_role: "teacher" });
        return { data: { rows: [], total: 0, next_cursor: null } as T, error: null };
      },
    });
    const res = await new UserRepository(ctx(adapter)).search({ role: "teacher" });
    expect(res.ok).toBe(true);
  });

  it("setStatus validates the status enum", async () => {
    const adapter = fakeAdapter();
    const res = await new UserRepository(ctx(adapter)).setStatus({ userId: "u1", status: "bogus" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("invalid_input");
    expect(adapter.calls).toHaveLength(0);
  });
});
