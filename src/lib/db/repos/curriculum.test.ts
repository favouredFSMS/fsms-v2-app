import { describe, expect, it } from "vitest";
import { CurriculumRepository } from "./curriculum";
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
    permissions: ["curriculum", "recordLearningCheck", "smartProgress", "learnerLessons"],
  });

const student = (): AuthProfile =>
  profile({
    role_base: "student",
    role_key: "student",
    role_label: "Student",
    rank: 0,
    permissions: ["curriculum", "smartProgress", "learnerLessons"],
  });

const teacherNoProgress = (): AuthProfile =>
  profile({
    role_base: "teacher",
    role_key: "teacher",
    role_label: "Teacher",
    rank: 40,
    permissions: ["curriculum"],
  });

const ctx = (adapter: ReturnType<typeof fakeAdapter>, p = profile()): DbContext => ({ profile: p, db: adapter });

const SID = "00000000-0000-0000-0000-000000000401";
const TID = "00000000-0000-0000-0000-000000000801";

describe("CurriculumRepository", () => {
  it("saveProgramme enforces curriculumManagement", async () => {
    const denied = await new CurriculumRepository(ctx(fakeAdapter(), teacher())).saveProgramme({
      name: "P",
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error.code).toBe("forbidden");
  });

  it("saveProgramme passes all args through", async () => {
    let args: Record<string, unknown> | undefined;
    const adapter = fakeAdapter({
      async rpc<T>(_n: string, a?: Record<string, unknown>) {
        args = a;
        return { data: { id: "p1" } as T, error: null };
      },
    });
    const res = await new CurriculumRepository(ctx(adapter)).saveProgramme({
      name: "Elementary",
      code: "EE-1",
      type: "course",
      standard: true,
    });
    expect(res.ok).toBe(true);
    expect(args?.p_name).toBe("Elementary");
    expect(args?.p_code).toBe("EE-1");
    expect(args?.p_standard).toBe(true);
  });

  it("saveObjective passes text/cefr through", async () => {
    let args: Record<string, unknown> | undefined;
    const adapter = fakeAdapter({
      async rpc<T>(_n: string, a?: Record<string, unknown>) {
        args = a;
        return { data: { id: "o1" } as T, error: null };
      },
    });
    const LID = "00000000-0000-0000-0000-000000000701";
    const res = await new CurriculumRepository(ctx(adapter)).saveObjective({
      lessonId: LID,
      text: "Can greet",
      code: "O1",
      cefr: "a2",
    });
    expect(res.ok).toBe(true);
    expect(args?.p_lesson).toBe(LID);
    expect(args?.p_text).toBe("Can greet");
    expect(args?.p_cefr).toBe("a2");
  });

  it("saveTopic enforces saveCurriculumTopic", async () => {
    const denied = await new CurriculumRepository(ctx(fakeAdapter(), student())).saveTopic({
      title: "T",
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error.code).toBe("forbidden");
  });

  it("saveEvidence enforces recordLearningCheck", async () => {
    const denied = await new CurriculumRepository(ctx(fakeAdapter(), student())).saveEvidence({
      studentId: SID,
      targetId: TID,
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error.code).toBe("forbidden");
  });

  it("saveEvidence passes score/quality/note through", async () => {
    let args: Record<string, unknown> | undefined;
    const adapter = fakeAdapter({
      async rpc<T>(_n: string, a?: Record<string, unknown>) {
        args = a;
        return { data: { id: "e1" } as T, error: null };
      },
    });
    const res = await new CurriculumRepository(ctx(adapter, teacher())).saveEvidence({
      studentId: SID,
      targetId: TID,
      score: 85,
      quality: "strong",
      note: "great",
    });
    expect(res.ok).toBe(true);
    expect(args?.p_student).toBe(SID);
    expect(args?.p_target).toBe(TID);
    expect(args?.p_score).toBe(85);
    expect(args?.p_quality).toBe("strong");
  });

  it("evidenceList maps rows to a Page", async () => {
    const adapter = fakeAdapter({
      async rpc<T>() {
        return { data: { rows: [{ id: "e1", source: "manual" }], total: 1, next_cursor: null } as T, error: null };
      },
    });
    const res = await new CurriculumRepository(ctx(adapter, teacher())).evidenceList({});
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.total).toBe(1);
  });

  it("learnerProgress enforces smartProgress", async () => {
    const denied = await new CurriculumRepository(ctx(fakeAdapter(), teacherNoProgress())).learnerProgress({
      studentId: SID,
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error.code).toBe("forbidden");
  });

  it("importCurriculum rejects invalid JSON payload", async () => {
    const res = await new CurriculumRepository(ctx(fakeAdapter())).importCurriculum({
      title: "C",
      payload: "{not json",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("invalid_input");
  });

  it("importCurriculum passes parsed payload through", async () => {
    let args: Record<string, unknown> | undefined;
    const adapter = fakeAdapter({
      async rpc<T>(_n: string, a?: Record<string, unknown>) {
        args = a;
        return { data: { id: "c1" } as T, error: null };
      },
    });
    const res = await new CurriculumRepository(ctx(adapter)).importCurriculum({
      title: "C",
      publisher: "HO",
      payload: '{"units":[{"title":"u1"}]}',
    });
    expect(res.ok).toBe(true);
    expect(JSON.parse(args?.p_payload as string)).toEqual({ units: [{ title: "u1" }] });
  });

  it("publishCurriculum enforces publishCurriculum", async () => {
    const denied = await new CurriculumRepository(ctx(fakeAdapter(), teacher())).publishCurriculum({
      curriculumId: "00000000-0000-0000-0000-000000000999",
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error.code).toBe("forbidden");
  });

  it("archiveCurriculum enforces archiveCurriculum", async () => {
    const denied = await new CurriculumRepository(ctx(fakeAdapter(), teacher())).archiveCurriculum({
      curriculumId: "00000000-0000-0000-0000-000000000999",
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error.code).toBe("forbidden");
  });

  it("saveCurriculum enforces saveCurriculum (teacher lacks it)", async () => {
    const denied = await new CurriculumRepository(ctx(fakeAdapter(), teacher())).saveCurriculum({
      curriculumId: "00000000-0000-0000-0000-000000000999",
      title: "T",
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error.code).toBe("forbidden");
  });

  it("deleteCurriculum enforces deleteCurriculum (leadership-only)", async () => {
    const denied = await new CurriculumRepository(ctx(fakeAdapter(), teacher())).deleteCurriculum({
      curriculumId: "00000000-0000-0000-0000-000000000999",
    });
    expect(denied.ok).toBe(false);
  });

  it("assignCurriculum passes curriculum and class through", async () => {
    let args: Record<string, unknown> | undefined;
    const adapter = fakeAdapter({
      async rpc<T>(_n: string, a?: Record<string, unknown>) {
        args = a;
        return { data: { id: "a1", is_primary: true } as T, error: null };
      },
    });
    const CLS = "00000000-0000-0000-0000-000000000501";
    const res = await new CurriculumRepository(ctx(adapter)).assignCurriculum({
      curriculumId: "00000000-0000-0000-0000-000000000999",
      classId: CLS,
    });
    expect(res.ok).toBe(true);
    expect(args?.p_curriculum).toBe("00000000-0000-0000-0000-000000000999");
    expect(args?.p_class).toBe(CLS);
  });
});
