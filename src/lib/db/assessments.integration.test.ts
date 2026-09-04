/**
 * Integration test for Phase 17 assessments against the local PostgreSQL
 * harness (skips when unreachable): test → record → results → performance
 * lifecycle plus student/parent visibility and write-denial. Cleans up.
 */
import { afterAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { fetchProfileFor } from "@/lib/auth/local-db";
import { PgAdapter } from "./pg-adapter";
import { AssessmentRepository } from "./repos/assessments";
import type { DbContext } from "./context";

const dbUrl = process.env.LOCAL_DB_URL ?? "postgres://fsms:fsms_dev@127.0.0.1:5432/fsms_v2";

const TEACHER = "00000000-0000-0000-0000-000000000202";
const PARENT = "00000000-0000-0000-0000-000000000203";
const STUDENT = "00000000-0000-0000-0000-000000000204";
const ANNA = "00000000-0000-0000-0000-000000000401";
const A2KIDS = "00000000-0000-0000-0000-000000000501";

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

afterAll(async () => {
  if (!reachable) return;
  const c = new Client({ connectionString: dbUrl });
  await c.connect();
  try {
    await c.query("set session_replication_role = replica");
    await c.query("delete from public.assessments where student_id = $1", [ANNA]);
    await c.query("delete from public.assessment_tests where student_id = $1", [ANNA]);
    await c.query("set session_replication_role = default");
  } finally {
    await c.end();
  }
});

describe.skipIf(!reachable)("assessments (integration)", () => {
  it("lifecycle: create test → record → generic mark → list → performance → archive", async () => {
    const teacher = new AssessmentRepository(await ctxFor(TEACHER));

    const test = await teacher.saveTest({
      studentId: ANNA,
      title: "Monthly — A2 (integration)",
      difficulty: "standard",
      types: ["reading", "listening"],
      tasks: [
        { n: 1, skill: "reading", text: "Read and answer" },
        { n: 2, skill: "listening", text: "Listen and choose" },
        { n: 3, skill: "reading", text: "Match words" },
      ],
      mode: "manual",
    });
    expect(test.ok && test.data?.status).toBe("published");
    const testId = test.ok ? test.data!.id : null;

    // record 2/3 correct → score 67
    const recorded = await teacher.recordTest({
      testId: testId!,
      marks: [
        { n: 1, correct: true },
        { n: 2, correct: false },
        { n: 3, correct: true },
      ],
    });
    expect(recorded.ok && recorded.data?.score).toBe(67);

    // generic mark
    const generic = await teacher.save({
      studentId: ANNA,
      classId: A2KIDS,
      type: "Quiz",
      title: "Vocabulary (integration)",
      score: 80,
      maxScore: 100,
    });
    expect(generic.ok && generic.data?.score).toBe(80);

    const list = await teacher.list({ studentId: ANNA });
    expect(list.ok && list.data?.total).toBe(2);

    const perf = await teacher.performance({ studentId: ANNA });
    expect(perf.ok && perf.data?.students[0]?.count).toBe(2);

    // archive (author)
    const archive = await teacher.archiveTest({ testId: testId! });
    expect(archive.ok && archive.data?.status).toBe("archived");
  });

  it("student and parent see own results but cannot write or see performance", async () => {
    const teacher = new AssessmentRepository(await ctxFor(TEACHER));
    await teacher.save({ studentId: ANNA, type: "Test", title: "For family", score: 90, maxScore: 100 });

    const student = new AssessmentRepository(await ctxFor(STUDENT));
    const sList = await student.list({});
    expect(sList.ok && sList.data?.items.some((a) => a.title === "For family")).toBe(true);
    const sWrite = await student.save({ studentId: ANNA, title: "nope" });
    expect(sWrite.ok).toBe(false);
    const sPerf = await student.performance({});
    expect(sPerf.ok && sPerf.data).toBeNull();

    const parent = new AssessmentRepository(await ctxFor(PARENT));
    const pList = await parent.list({});
    expect(pList.ok && pList.data?.items.some((a) => a.title === "For family")).toBe(true);
    const pTests = await parent.tests({});
    // only published tests are visible to family; all of this phase's are archived/absent
    expect(pTests.ok).toBe(true);
  });
});
