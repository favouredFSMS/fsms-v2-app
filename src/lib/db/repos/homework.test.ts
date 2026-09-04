import { describe, expect, it } from "vitest";
import { HomeworkRepository } from "./homework";
import { fakeAdapter } from "../testing/fake-adapter";
import type { DbContext } from "../context";
import type { AuthProfile } from "@/lib/auth/types";

const owner = (over: Partial<AuthProfile> = {}): AuthProfile => ({
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

const parent = (): AuthProfile =>
  owner({ role_base: "parent", role_key: "parent", role_label: "Parent", rank: 10, permissions: ["homework", "submitHomework", "submission"] });

const ctx = (adapter: ReturnType<typeof fakeAdapter>, p = owner()): DbContext => ({ profile: p, db: adapter });

const SID = "00000000-0000-0000-0000-000000000401";
const CID = "00000000-0000-0000-0000-000000000501";

describe("HomeworkRepository", () => {
  it("list maps rows to a Page", async () => {
    const adapter = fakeAdapter({
      async rpc<T>() {
        return { data: { rows: [{ id: "h1", status: "assigned", submissions: 0 }], total: 1, next_cursor: null } as T, error: null };
      },
    });
    const res = await new HomeworkRepository(ctx(adapter)).list({ classId: CID });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.total).toBe(1);
  });

  it("assign enforces saveHomework and serializes marks as JSON", async () => {
    const deniedAdapter = fakeAdapter();
    const denied = await new HomeworkRepository(ctx(deniedAdapter, parent())).assign({
      classId: CID,
      date: "2026-09-05",
      title: "WB",
      studentIds: [SID],
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error.code).toBe("forbidden");

    let args: Record<string, unknown> | undefined;
    const adapter = fakeAdapter({
      async rpc<T>(_n: string, a?: Record<string, unknown>) {
        args = a;
        return { data: { created: 1 } as T, error: null };
      },
    });
    const res = await new HomeworkRepository(ctx(adapter)).assign({
      classId: CID,
      date: "2026-09-05",
      title: "WB",
      dueDate: "2026-09-10",
      studentIds: [SID],
    });
    expect(res.ok).toBe(true);
    const marks = JSON.parse(args?.p_marks as string) as Array<{ student_id: string; title: string; due_date: string }>;
    expect(marks).toHaveLength(1);
    expect(marks[0]).toMatchObject({ student_id: SID, title: "WB", due_date: "2026-09-10" });
  });

  it("submit enforces submitHomework", async () => {
    const adapter = fakeAdapter();
    const denied = await new HomeworkRepository(ctx(adapter, owner({ role_base: "teacher", role_key: "teacher", permissions: ["homework", "saveHomework", "gradeHomework"] }))).submit({
      homeworkId: SID,
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error.code).toBe("forbidden");
  });

  it("grade validates status enum", async () => {
    const adapter = fakeAdapter();
    const bad = await new HomeworkRepository(ctx(adapter)).grade({
      homeworkId: SID,
      status: "bogus",
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.code).toBe("invalid_input");
  });
});
