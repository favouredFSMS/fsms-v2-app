import { describe, expect, it } from "vitest";
import { LessonRepository, localized } from "./lessons";
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
    permissions: ["lessonLogs", "saveLessonLog", "prepareLesson", "requestLessonChange", "lessonControl", "saveLessonControl", "lessonChanges", "lessonSpineIndex", "lessonCalendar"],
  });

const parent = (): AuthProfile =>
  profile({
    role_base: "parent",
    role_key: "parent",
    role_label: "Parent",
    rank: 10,
    permissions: ["lessonLogs", "lessonChanges", "lessonControl", "requestLessonChange"],
  });

const ctx = (adapter: ReturnType<typeof fakeAdapter>, p = profile()): DbContext => ({ profile: p, db: adapter });

const CID = "00000000-0000-0000-0000-000000000501";
const LID = "00000000-0000-0000-0000-000000000603";

describe("LessonRepository", () => {
  it("spine maps programmes to LessonSpine", async () => {
    const adapter = fakeAdapter({
      async rpc<T>() {
        return { data: { programmes: [{ id: "p1", units: [] }] } as T, error: null };
      },
    });
    const res = await new LessonRepository(ctx(adapter)).spine({});
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data?.programmes).toHaveLength(1);
  });

  it("saveLog enforces saveLessonLog and serializes topicIds as JSON", async () => {
    const denied = await new LessonRepository(ctx(fakeAdapter(), parent())).saveLog({
      classId: CID,
      date: "2026-09-04",
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error.code).toBe("forbidden");

    let args: Record<string, unknown> | undefined;
    const adapter = fakeAdapter({
      async rpc<T>(_n: string, a?: Record<string, unknown>) {
        args = a;
        return { data: { id: "log1" } as T, error: null };
      },
    });
    const res = await new LessonRepository(ctx(adapter, teacher())).saveLog({
      classId: CID,
      date: "2026-09-04",
      lessonNo: 1,
      topicIds: ["00000000-0000-0000-0000-000000000901"],
    });
    expect(res.ok).toBe(true);
    expect(args?.p_topic_ids).toBe('["00000000-0000-0000-0000-000000000901"]');
  });

  it("deleteLog and decideChange are leadership-gated", async () => {
    const del = await new LessonRepository(ctx(fakeAdapter(), teacher())).deleteLog({ logId: "x" });
    expect(del.ok).toBe(false);
    if (!del.ok) expect(del.error.code).toBe("forbidden");

    const decide = await new LessonRepository(ctx(fakeAdapter(), teacher())).decideChange({
      changeId: CID,
      decision: "approved",
    });
    expect(decide.ok).toBe(false);
    if (!decide.ok) expect(decide.error.code).toBe("forbidden");
  });

  it("savePlan rejects invalid JSON and serializes valid JSON", async () => {
    const bad = await new LessonRepository(ctx(fakeAdapter(), teacher())).savePlan({
      classId: CID,
      lessonId: null,
      plan: "{not json",
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.code).toBe("invalid_input");

    let args: Record<string, unknown> | undefined;
    const adapter = fakeAdapter({
      async rpc<T>(_n: string, a?: Record<string, unknown>) {
        args = a;
        return { data: { id: "p1" } as T, error: null };
      },
    });
    const res = await new LessonRepository(ctx(adapter, teacher())).savePlan({
      classId: CID,
      lessonId: LID,
      plan: '{"text":"Warm up"}',
    });
    expect(res.ok).toBe(true);
    expect(args?.p_plan).toBe('{"text":"Warm up"}');
  });

  it("requestChange is allowed for parents (catalog) and calls the RPC", async () => {
    let called = false;
    const adapter = fakeAdapter({
      async rpc<T>() {
        called = true;
        return { data: { id: "c1" } as T, error: null };
      },
    });
    const res = await new LessonRepository(ctx(adapter, parent())).requestChange({
      classId: CID,
      fromDate: "2026-09-10",
      toDate: null,
      reason: "holiday",
    });
    expect(res.ok).toBe(true);
    expect(called).toBe(true);
  });

  it("saveControl serializes the value as JSON", async () => {
    let args: Record<string, unknown> | undefined;
    const adapter = fakeAdapter({
      async rpc<T>(_n: string, a?: Record<string, unknown>) {
        args = a;
        return { data: { id: "k1" } as T, error: null };
      },
    });
    const res = await new LessonRepository(ctx(adapter, teacher())).saveControl({
      classId: CID,
      key: "lessonStatus",
      value: '"PREPARED"',
    });
    expect(res.ok).toBe(true);
    expect(args?.p_value).toBe('"PREPARED"');
  });

  it("localized falls back across locales", () => {
    expect(localized({ en: "Lesson 1" })).toBe("Lesson 1");
    expect(localized({ ru: "Урок 1" }, "ru")).toBe("Урок 1");
    expect(localized({ ru: "Урок 1" })).toBe("Урок 1");
    expect(localized(null)).toBe("");
  });
});
