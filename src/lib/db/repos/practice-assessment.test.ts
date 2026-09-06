import { describe, it, expect } from "vitest";
import { AssessmentRepository } from "./assessments";
import { fakeAdapter } from "../testing/fake-adapter";
import type { DbContext } from "../context";
import type { AuthProfile } from "@/lib/auth/types";

const profile = (over: Partial<AuthProfile> = {}): AuthProfile => ({
  id: "u1",
  school_id: "s1",
  email: "test@example.com",
  name: "Test User",
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

const studentProfile = (): AuthProfile =>
  profile({
    id: "student-1",
    role_base: "student",
    role_key: "student",
    role_label: "Student",
    rank: 0,
    permissions: ["assessments"],
  });

const teacherProfile = (): AuthProfile =>
  profile({
    id: "teacher-1",
    role_base: "teacher",
    role_key: "teacher",
    role_label: "Teacher",
    rank: 40,
    permissions: ["assessments", "saveAssessment", "performance"],
  });

const ctx = (adapter: ReturnType<typeof fakeAdapter>, p = profile()): DbContext => ({ profile: p, db: adapter });
const SID = "00000000-0000-0000-0000-000000000401";
const TID = "00000000-0000-0000-0000-000000000999";

describe("Practice & Assessment Workflow Isolation & Resilience", () => {
  it("denies student role from creating or modifying assessment tests", async () => {
    const repo = new AssessmentRepository(ctx(fakeAdapter(), studentProfile()));
    const res = await repo.saveTest({
      studentId: SID,
      title: "Mid-Term",
      tasks: [{ n: 1, text: "Grammar question" }],
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe("forbidden");
    }
  });

  it("permits teacher role to create assessment tests with structured tasks", async () => {
    let capturedArgs: Record<string, unknown> | undefined;
    const adapter = fakeAdapter({
      async rpc<T>(_n: string, a?: Record<string, unknown>) {
        capturedArgs = a;
        return { data: { id: TID, title: "Monthly CEFR Test" } as T, error: null };
      },
    });
    const repo = new AssessmentRepository(ctx(adapter, teacherProfile()));
    const res = await repo.saveTest({
      studentId: SID,
      title: "Monthly CEFR Test",
      types: ["grammar", "vocabulary"],
      tasks: [
        { n: 1, skill: "grammar", text: "Past simple drill" },
        { n: 2, skill: "vocabulary", text: "Antonyms drill" },
      ],
      mode: "manual",
    });
    expect(res.ok).toBe(true);
    expect(capturedArgs?.p_title).toBe("Monthly CEFR Test");
    expect(capturedArgs?.p_mode).toBe("manual");
  });

  it("gracefully records marks on completed tests with score derivation", async () => {
    const adapter = fakeAdapter({
      async rpc<T>() {
        return {
          data: {
            assessment_id: "a-123",
            score: 100,
            correct: 3,
            total: 3,
          } as T,
          error: null,
        };
      },
    });
    const repo = new AssessmentRepository(ctx(adapter, teacherProfile()));
    const res = await repo.recordTest({
      testId: TID,
      marks: [
        { n: 1, correct: true },
        { n: 2, correct: true },
        { n: 3, correct: true },
      ],
    });
    expect(res.ok).toBe(true);
    if (res.ok && res.data) {
      expect(res.data.score).toBe(100);
      expect(res.data.correct).toBe(3);
    }
  });

  it("handles empty assessment list without crashing", async () => {
    const adapter = fakeAdapter({
      async rpc<T>() {
        return { data: { rows: [] } as T, error: null };
      },
    });
    const repo = new AssessmentRepository(ctx(adapter, studentProfile()));
    const res = await repo.tests({ studentId: SID });
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.data).toEqual([]);
    }
  });
});
