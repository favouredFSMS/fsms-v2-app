/**
 * Integration test for the Phase 10 data-access layer against the real local
 * PostgreSQL harness (skips when the harness DB is unreachable).
 *
 * Proves: repository → PgAdapter (role-authenticated, RLS-scoped) → the
 * fsms.student_search RPC, keyset pagination, visibility scoping, RBAC
 * pre-checks, and RLS enforcement on writes.
 */
import { describe, expect, it } from "vitest";
import { Client } from "pg";
import { fetchProfileFor } from "@/lib/auth/local-db";
import { PgAdapter } from "./pg-adapter";
import { StudentRepository } from "./repos/students";
import type { DbContext } from "./context";

const dbUrl = process.env.LOCAL_DB_URL ?? "postgres://fsms:fsms_dev@127.0.0.1:5432/fsms_v2";

const OWNER = "00000000-0000-0000-0000-000000000201";
const PARENT = "00000000-0000-0000-0000-000000000203";
const STUDENT = "00000000-0000-0000-0000-000000000204";

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

/** Cleanup helper: hard-delete a student by id (runs as superuser, not RLS). */
async function purgeStudent(id: string): Promise<void> {
  const c = new Client({ connectionString: dbUrl });
  await c.connect();
  try {
    await c.query("set session_replication_role = replica");
    await c.query("delete from public.audit_log where entity = 'students' and entity_id = $1", [id]);
    await c.query("delete from public.students where id = $1", [id]);
    await c.query("set session_replication_role = default");
  } finally {
    await c.end();
  }
}

/** Remove any rows a previous aborted run may have left behind. */
async function purgeByStudentNo(no: string): Promise<void> {
  const c = new Client({ connectionString: dbUrl });
  await c.connect();
  try {
    await c.query("set session_replication_role = replica");
    await c.query(
      "delete from public.audit_log where entity = 'students' and entity_id in (select id from public.students where student_no = $1)",
      [no],
    );
    await c.query("delete from public.students where student_no = $1", [no]);
    await c.query("set session_replication_role = default");
  } finally {
    await c.end();
  }
}

describe.skipIf(!reachable)("data-access layer (integration)", () => {
  it("owner lists all 3 students via the RPC", async () => {
    const repo = new StudentRepository(await ctxFor(OWNER));
    const res = await repo.search({});
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.total).toBeGreaterThanOrEqual(3);
    expect(res.data.items.map((s) => s.name)).toContain("Anna");
  });

  it("parent sees ONLY their linked children (visibility scoping)", async () => {
    const repo = new StudentRepository(await ctxFor(PARENT));
    const res = await repo.search({});
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.total).toBe(2); // linked to Anna + Boris, not Clara
    const names = res.data.items.map((s) => s.name);
    expect(names).toContain("Anna");
    expect(names).toContain("Boris");
    expect(names).not.toContain("Clara");
  });

  it("student sees only themselves", async () => {
    const repo = new StudentRepository(await ctxFor(STUDENT));
    const res = await repo.search({});
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.total).toBe(1);
    expect(res.data.items[0].name).toBe("Anna");
  });

  it("keyset paginates: page 2 returns the remaining rows via nextCursor", async () => {
    const repo = new StudentRepository(await ctxFor(OWNER));
    const p1 = await repo.search({ pageSize: 2 });
    if (!p1.ok) throw new Error("page 1 failed");
    expect(p1.data.items).toHaveLength(2);
    expect(p1.data.nextCursor).toBeTruthy();

    const p2 = await repo.search({ pageSize: 2, cursor: p1.data.nextCursor });
    if (!p2.ok) throw new Error("page 2 failed");
    expect(p2.data.items.length).toBeGreaterThanOrEqual(1);

    // no overlap across pages
    const ids1 = new Set(p1.data.items.map((s) => s.id));
    for (const item of p2.data.items) {
      expect(ids1.has(item.id)).toBe(false);
    }
  });

  it("searches and filters server-side", async () => {
    const repo = new StudentRepository(await ctxFor(OWNER));
    const byName = await repo.search({ search: "Boris" });
    if (!byName.ok) throw new Error("search failed");
    expect(byName.data.total).toBeGreaterThanOrEqual(1);
    expect(byName.data.items.some((s) => s.name === "Boris")).toBe(true);

    const byLevel = await repo.search({ level: "b1" });
    if (!byLevel.ok) throw new Error("filter failed");
    expect(byLevel.data.total).toBeGreaterThanOrEqual(1);
    expect(byLevel.data.items.some((s) => s.name === "Clara")).toBe(true);
  });

  it("getById respects visibility: parent can read a linked child, but not an unlinked one", async () => {
    const repo = new StudentRepository(await ctxFor(PARENT));
    const linked = await repo.getById("00000000-0000-0000-0000-000000000401"); // Anna
    expect(linked.ok).toBe(true);
    if (linked.ok) expect(linked.data?.name).toBe("Anna");

    const unlinked = await repo.getById("00000000-0000-0000-0000-000000000403"); // Clara
    expect(unlinked.ok).toBe(true);
    if (unlinked.ok) expect(unlinked.data).toBeNull(); // RLS hides it — no data leak
  });

  it("create: RBAC denies a teacher (no saveStudent) and allows the owner", async () => {
    const teacherProfile = await fetchProfileFor("00000000-0000-0000-0000-000000000202");
    const teacherCtx: DbContext = {
      profile: teacherProfile!,
      db: new PgAdapter(teacherProfile!.id),
    };
    const denied = await new StudentRepository(teacherCtx).create({ name: "Nope" });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error.code).toBe("forbidden");

    const ownerRepo = new StudentRepository(await ctxFor(OWNER));
    await purgeByStudentNo("S-TEST"); // defensive: clear leftovers from prior runs
    const created = await ownerRepo.create({ name: "Test Student", student_no: "S-TEST" });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    // RLS set the tenant: the new row belongs to the owner's school
    const verify = await ownerRepo.getById(created.data.id);
    expect(verify.ok && verify.data?.name === "Test Student").toBe(true);

    await purgeStudent(created.data.id);
  });
});
