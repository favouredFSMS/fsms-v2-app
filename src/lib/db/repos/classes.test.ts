import { describe, expect, it } from "vitest";
import { ClassRepository } from "./classes";
import { AcademicRepository } from "./academic";
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
  owner({ role_base: "parent", role_key: "parent", role_label: "Parent", rank: 10, permissions: ["classes"] });

const teacher = (): AuthProfile =>
  owner({ role_base: "teacher", role_key: "teacher", role_label: "Teacher", rank: 50, permissions: ["classes", "saveClass", "classProfile", "classRoster", "subjectOptions"] });

const ctx = (adapter: ReturnType<typeof fakeAdapter>, p = owner()): DbContext => ({ profile: p, db: adapter });

describe("ClassRepository", () => {
  it("search maps the RPC payload to a Page", async () => {
    let fn = "";
    const adapter = fakeAdapter({
      async rpc<T>(name: string) {
        fn = name;
        return {
          data: {
            rows: [{ id: "c1", name: "A2 Kids", teachers: null }],
            total: 1,
            next_cursor: null,
          } as T,
          error: null,
        };
      },
    });
    const res = await new ClassRepository(ctx(adapter)).search({});
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.total).toBe(1);
    expect(res.data.items[0].teachers).toEqual([]);
    expect(fn).toBe("class_search");
  });

  it("create enforces saveClass", async () => {
    const adapter = fakeAdapter();
    const res = await new ClassRepository(ctx(adapter, parent())).create({ name: "X" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("forbidden");
    expect(adapter.calls.filter((c) => c.op === "rpc")).toHaveLength(0);
  });

  it("assignTeacher enforces saveTeacherAssignments", async () => {
    const adapter = fakeAdapter();
    const res = await new ClassRepository(ctx(adapter, teacher())).assignTeacher({
      classId: "00000000-0000-0000-0000-000000000501",
      userId: "00000000-0000-0000-0000-000000000202",
      primary: false,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("forbidden");
  });

  it("enrolStudent validates status enum and enforces enrolStudent", async () => {
    const sid = "00000000-0000-0000-0000-000000000401";
    const cid = "00000000-0000-0000-0000-000000000501";
    const adapter = fakeAdapter();
    const denied = await new ClassRepository(ctx(adapter, teacher())).enrolStudent({
      studentId: sid,
      classId: cid,
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error.code).toBe("forbidden");

    const bad = await new ClassRepository(ctx(adapter)).setEnrolmentStatus({
      enrolmentId: sid,
      status: "bogus",
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.code).toBe("invalid_input");
  });
});

describe("AcademicRepository", () => {
  it("structure returns the reference payload", async () => {
    const adapter = fakeAdapter({
      async rpc<T>() {
        return {
          data: {
            school: { id: "s1", name: "School" },
            levels: [],
            subjects: [],
            academic_years: [],
            terms: [],
          } as T,
          error: null,
        };
      },
    });
    const res = await new AcademicRepository(ctx(adapter)).structure();
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data?.school?.name).toBe("School");
  });

  it("createSubject enforces saveSubjects", async () => {
    const adapter = fakeAdapter();
    const res = await new AcademicRepository(ctx(adapter, teacher())).createSubject({ name: "Science" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("forbidden");
  });
});
