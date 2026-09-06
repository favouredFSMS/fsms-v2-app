/**
 * Integration test for Phase 16 lessons against the local PostgreSQL harness
 * (skips when unreachable): log → upsert → list, plan, change request → decide,
 * controls, and permission/visibility gating. Cleans up.
 */
import { afterAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { fetchProfileFor } from "@/lib/auth/local-db";
import { PgAdapter } from "./pg-adapter";
import { LessonRepository } from "./repos/lessons";
import type { DbContext } from "./context";

const dbUrl = process.env.LOCAL_DB_URL ?? "postgres://fsms:fsms_dev@127.0.0.1:5432/fsms_v2";

const OWNER = "00000000-0000-0000-0000-000000000201";
const TEACHER = "00000000-0000-0000-0000-000000000202";
const PARENT = "00000000-0000-0000-0000-000000000203";
const A2KIDS = "00000000-0000-0000-0000-000000000501";
const LESSON = "00000000-0000-0000-0000-000000000603";
const DATE = "2026-02-10";

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
    await c.query("delete from public.lesson_changes where class_id = $1", [A2KIDS]);
    await c.query("delete from public.lesson_logs where class_id = $1 and date = $2", [A2KIDS, DATE]);
    await c.query("delete from public.lesson_plans where class_id = $1", [A2KIDS]);
    await c.query("delete from public.lesson_controls where class_id = $1", [A2KIDS]);
    await c.query("set session_replication_role = default");
  } finally {
    await c.end();
  }
});

describe.skipIf(!reachable)("lessons (integration)", () => {
  it("lifecycle: log → upsert → list → plan → change request → decide → control", async () => {
    const teacher = new LessonRepository(await ctxFor(TEACHER));
    const owner = new LessonRepository(await ctxFor(OWNER));

    // curriculum spine + detail (staff)
    const spine = await teacher.spine({});
    expect(spine.ok && spine.data?.programmes.length).toBeGreaterThan(0);
    const detail = await teacher.detail({ lessonId: LESSON });
    expect(detail.ok && detail.data?.objectives.length).toBeGreaterThan(0);

    // lesson record: create then upsert (same id)
    const first = await teacher.saveLog({
      classId: A2KIDS,
      date: DATE,
      lessonNo: 1,
      topic: "Greetings",
      participation: "all present",
      teacherNote: "good energy",
      durationMin: 45,
    });
    expect(first.ok && first.data?.id).toBeTruthy();
    const id = first.ok ? first.data!.id : null;

    const second = await teacher.saveLog({
      classId: A2KIDS,
      date: DATE,
      lessonNo: 1,
      topic: "Greetings v2",
    });
    expect(second.ok && second.data?.id).toBe(id);

    const logs = await teacher.logs({ classId: A2KIDS, from: DATE, to: DATE, pageSize: 30 });
    expect(logs.ok && logs.data?.total).toBe(1);
    expect(logs.ok && logs.data?.items[0]?.topic).toBe("Greetings v2");

    // plan: create then upsert (same id)
    const plan1 = await teacher.savePlan({ classId: A2KIDS, lessonId: LESSON, plan: '{"text":"Warm up"}' });
    const plan2 = await teacher.savePlan({ classId: A2KIDS, lessonId: LESSON, plan: '{"text":"Warm up + roleplay"}' });
    expect(plan1.ok && plan2.ok && plan1.data?.id).toBe(plan2.ok ? plan2.data?.id : undefined);
    const plans = await teacher.plans({ classId: A2KIDS });
    expect(plans.ok && plans.data).toHaveLength(1);

    // change request (teacher) → decide (owner)
    const req = await teacher.requestChange({ classId: A2KIDS, fromDate: DATE, toDate: "2026-02-12", reason: "holiday" });
    expect(req.ok && req.data?.id).toBeTruthy();
    const changeId = req.ok ? req.data!.id : null;

    const decide = await owner.decideChange({ changeId: changeId!, decision: "approved" });
    expect(decide.ok && decide.data?.decision).toBe("approved");

    const changes = await owner.changes({ classId: A2KIDS });
    expect(changes.ok && changes.data.some((c) => c.id === changeId && c.decision === "approved")).toBe(true);

    // controls (teacher)
    const ctrl = await teacher.saveControl({ classId: A2KIDS, key: "lessonStatus", value: '"PREPARED"' });
    expect(ctrl.ok && ctrl.data?.key).toBe("lessonStatus");
    const controls = await teacher.controls({ classId: A2KIDS });
    expect(controls.ok && controls.data.some((c) => c.key === "lessonStatus")).toBe(true);
  });

  it("visibility: parent sees own class logs but cannot write; teacher cannot decide", async () => {
    const teacher = new LessonRepository(await ctxFor(TEACHER));
    const parent = new LessonRepository(await ctxFor(PARENT));

    await teacher.saveLog({ classId: A2KIDS, date: DATE, lessonNo: 2, topic: "Family words" });

    const parentLogs = await parent.logs({ classId: A2KIDS, pageSize: 30 });
    expect(parentLogs.ok && parentLogs.data?.items.some((l) => l.topic === "Family words")).toBe(true);

    const parentWrite = await parent.saveLog({ classId: A2KIDS, date: DATE, lessonNo: 3, topic: "nope" });
    expect(parentWrite.ok).toBe(false);

    const parentSpine = await parent.spine({});
    expect(parentSpine.ok && parentSpine.data).toBeNull();

    const parentChange = await parent.requestChange({ classId: A2KIDS, fromDate: DATE, toDate: null, reason: "cancel" });
    expect(parentChange.ok && parentChange.data?.id).toBeTruthy();

    const teacherDecide = await teacher.decideChange({ changeId: parentChange.ok ? parentChange.data!.id : "", decision: "declined" });
    expect(teacherDecide.ok).toBe(false);
  });
});
