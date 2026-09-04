/**
 * Integration test for Phase 12 people management against the local PostgreSQL
 * harness (skips when unreachable): parent_search, user_search, student_detail
 * visibility scoping, and office user administration RPCs.
 */
import { describe, expect, it } from "vitest";
import { Client } from "pg";
import { fetchProfileFor } from "@/lib/auth/local-db";
import { PgAdapter } from "./pg-adapter";
import { ParentRepository } from "./repos/parents";
import { UserRepository } from "./repos/users";
import { StudentRepository } from "./repos/students";
import type { DbContext } from "./context";

const dbUrl = process.env.LOCAL_DB_URL ?? "postgres://fsms:fsms_dev@127.0.0.1:5432/fsms_v2";

const OWNER = "00000000-0000-0000-0000-000000000201";
const TEACHER = "00000000-0000-0000-0000-000000000202";
const PARENT = "00000000-0000-0000-0000-000000000203";
const ANNA = "00000000-0000-0000-0000-000000000401";
const CLARA = "00000000-0000-0000-0000-000000000403";

let reachable = false;
try {
  const c = new Client({ connectionString: dbUrl });
  await c.connect();
  await c.query("select 1");
  await c.end();
  reachable = true;
} catch {
  reachable = false;
}

async function ctxFor(sub: string): Promise<DbContext> {
  const profile = await fetchProfileFor(sub);
  if (!profile) throw new Error(`no profile for ${sub}`);
  return { profile, db: new PgAdapter(sub) };
}

describe.skipIf(!reachable)("people management (integration)", () => {
  it("owner lists parents via parent_search", async () => {
    const res = await new ParentRepository(await ctxFor(OWNER)).search({});
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.total).toBe(1);
    expect(res.data.items[0].name).toContain("Parent");
    expect(res.data.items[0].children).toBe(2);
  });

  it("teacher lists only teacher accounts via user_search", async () => {
    const res = await new UserRepository(await ctxFor(TEACHER)).search({ role: "teacher" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.total).toBe(1);
    expect(res.data.items[0].role_base).toBe("teacher");
  });

  it("student_detail exposes parent contact only to office roles", async () => {
    const owner = await new StudentRepository(await ctxFor(OWNER)).detail(ANNA);
    expect(owner.ok && owner.data).toBeTruthy();
    if (owner.ok && owner.data) {
      expect(owner.data.parents[0].phone).toBeTruthy(); // office sees contact
    }

    const teacher = await new StudentRepository(await ctxFor(TEACHER)).detail(ANNA);
    expect(teacher.ok && teacher.data).toBeTruthy();
    if (teacher.ok && teacher.data) {
      expect(teacher.data.parents[0].name).toBeTruthy();
      expect(teacher.data.parents[0].phone).toBeNull(); // teacher does NOT
    }
  });

  it("parent cannot see an unlinked student's detail", async () => {
    const res = await new StudentRepository(await ctxFor(PARENT)).detail(CLARA);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data).toBeNull();
  });

  it("owner can change a user's status (idempotent)", async () => {
    const res = await new UserRepository(await ctxFor(OWNER)).setStatus({
      userId: TEACHER,
      status: "active",
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data?.status).toBe("active");
  });
});
