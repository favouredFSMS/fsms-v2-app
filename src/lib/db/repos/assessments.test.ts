import { describe, expect, it } from "vitest";
import { AssessmentRepository } from "./assessments";
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

const teacher = (): AuthProfile =>
  profile({
    role_base: "teacher",
    role_key: "teacher",
    role_label: "Teacher",
    rank: 40,
    permissions: ["assessments", "saveAssessment", "performance"],
  });

const parent = (): AuthProfile =>
  profile({
    role_base: "parent",
    role_key: "parent",
    role_label: "Parent",
    rank: 10,
    permissions: ["assessments"],
  });

const ctx = (adapter: ReturnType<typeof fakeAdapter>, p = profile()): DbContext => ({ profile: p, db: adapter });

const SID = "00000000-0000-0000-0000-000000000401";

describe("AssessmentRepository", () => {
  it("list maps rows to a Page", async () => {
    const adapter = fakeAdapter({
      async rpc<T>() {
        return { data: { rows: [{ id: "a1", score: 90 }], total: 1, next_cursor: null } as T, error: null };
      },
    });
    const res = await new AssessmentRepository(ctx(adapter)).list({});
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.total).toBe(1);
  });

  it("save enforces saveAssessment", async () => {
    const denied = await new AssessmentRepository(ctx(fakeAdapter(), parent())).save({
      studentId: SID,
      title: "Quiz",
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error.code).toBe("forbidden");
  });

  it("saveTest serializes types and tasks as JSON", async () => {
    let args: Record<string, unknown> | undefined;
    const adapter = fakeAdapter({
      async rpc<T>(_n: string, a?: Record<string, unknown>) {
        args = a;
        return { data: { id: "t1" } as T, error: null };
      },
    });
    const res = await new AssessmentRepository(ctx(adapter, teacher())).saveTest({
      studentId: SID,
      title: "Monthly",
      types: ["reading", "listening"],
      tasks: [{ n: 1, skill: "reading", text: "Read" }],
      mode: "manual",
    });
    expect(res.ok).toBe(true);
    expect(args?.p_types).toBe('["reading","listening"]');
    expect(JSON.parse(args?.p_tasks as string)).toHaveLength(1);
  });

  it("recordTest serializes marks as JSON", async () => {
    let args: Record<string, unknown> | undefined;
    const adapter = fakeAdapter({
      async rpc<T>(_n: string, a?: Record<string, unknown>) {
        args = a;
        return { data: { assessment_id: "a1", score: 67, correct: 2, total: 3 } as T, error: null };
      },
    });
    const res = await new AssessmentRepository(ctx(adapter, teacher())).recordTest({
      testId: "00000000-0000-0000-0000-000000000999",
      marks: [
        { n: 1, correct: true },
        { n: 2, correct: false },
      ],
    });
    expect(res.ok).toBe(true);
    expect(JSON.parse(args?.p_marks as string)).toEqual([
      { n: 1, correct: true },
      { n: 2, correct: false },
    ]);
  });

  it("archiveTest is gated by saveAssessment", async () => {
    const denied = await new AssessmentRepository(ctx(fakeAdapter(), parent())).archiveTest({
      testId: "00000000-0000-0000-0000-000000000999",
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error.code).toBe("forbidden");
  });
});
