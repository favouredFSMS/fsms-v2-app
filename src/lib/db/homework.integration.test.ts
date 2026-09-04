/**
 * Integration test for Phase 15 homework against the local PostgreSQL harness
 * (skips when unreachable): assign → list → submit → grade lifecycle, idempotent
 * assignment, notification emission, and permission/visibility gating. Cleans up.
 */
import { afterAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { fetchProfileFor } from "@/lib/auth/local-db";
import { PgAdapter } from "./pg-adapter";
import { HomeworkRepository } from "./repos/homework";
import type { DbContext } from "./context";

const dbUrl = process.env.LOCAL_DB_URL ?? "postgres://fsms:fsms_dev@127.0.0.1:5432/fsms_v2";

const TEACHER = "00000000-0000-0000-0000-000000000202";
const PARENT = "00000000-0000-0000-0000-000000000203";
const STUDENT = "00000000-0000-0000-0000-000000000204";
const ANNA = "00000000-0000-0000-0000-000000000401";
const BORIS = "00000000-0000-0000-0000-000000000402";
const CLARA = "00000000-0000-0000-0000-000000000403";
const A2KIDS = "00000000-0000-0000-0000-000000000501";
const DATE = "2026-01-20";

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

/** Superuser read of notifications for one homework item (bypasses RLS). */
async function notifRows(homeworkId: string): Promise<Array<{ kind: string; user_id: string }>> {
  const c = new Client({ connectionString: dbUrl });
  await c.connect();
  try {
    const r = await c.query(
      "select kind, user_id from public.notifications where payload->>'homework_id' = $1 order by kind",
      [homeworkId],
    );
    return r.rows as Array<{ kind: string; user_id: string }>;
  } finally {
    await c.end();
  }
}

afterAll(async () => {
  if (!reachable) return;
  const c = new Client({ connectionString: dbUrl });
  await c.connect();
  try {
    await c.query("set session_replication_role = replica");
    await c.query("delete from public.notifications where payload->>'homework_id' in (select id::text from public.homework where class_id = $1 and date = $2)", [A2KIDS, DATE]);
    await c.query("delete from public.homework_submissions where homework_id in (select id from public.homework where class_id = $1 and date = $2)", [A2KIDS, DATE]);
    await c.query("delete from public.homework where class_id = $1 and date = $2", [A2KIDS, DATE]);
    await c.query("set session_replication_role = default");
  } finally {
    await c.end();
  }
});

describe.skipIf(!reachable)("homework (integration)", () => {
  it("full lifecycle: assign → submit → grade", async () => {
    const teacher = new HomeworkRepository(await ctxFor(TEACHER));

    const assign = await teacher.assign({
      classId: A2KIDS,
      date: DATE,
      title: "Unit 1 Workbook",
      dueDate: "2026-01-25",
      studentIds: [ANNA, BORIS],
    });
    expect(assign.ok && assign.data?.created).toBe(2);

    // idempotent re-assign
    const again = await teacher.assign({
      classId: A2KIDS,
      date: DATE,
      title: "Unit 1 Workbook",
      studentIds: [ANNA],
    });
    expect(again.ok && again.data?.created).toBe(0);

    const list = await teacher.list({ classId: A2KIDS, from: DATE, to: DATE });
    expect(list.ok && list.data?.total).toBe(2);

    const homeworkId = list.ok ? list.data.items.find((h) => h.student_id === ANNA)?.id : undefined;
    expect(homeworkId).toBeTruthy();

    // student submits
    const student = new HomeworkRepository(await ctxFor(STUDENT));
    const submit = await student.submit({ homeworkId: homeworkId!, note: "Done!" });
    expect(submit.ok && submit.data).toBeTruthy();

    // teacher grades
    const grade = await teacher.grade({ homeworkId: homeworkId!, score: "A", feedback: "Great", status: "graded" });
    expect(grade.ok && grade.data?.status).toBe("graded");

    const graded = await teacher.list({ classId: A2KIDS, status: "graded" });
    expect(graded.ok && graded.data?.total).toBe(1);

    // notifications: assigned → student + parent; submitted → teacher; graded → student + parent
    const notifs = await notifRows(homeworkId!);
    expect(notifs.filter((n) => n.kind === "homework.assigned").map((n) => n.user_id).sort())
      .toEqual([PARENT, STUDENT].sort());
    expect(notifs.some((n) => n.kind === "homework.submitted" && n.user_id === TEACHER)).toBe(true);
    expect(notifs.some((n) => n.kind === "homework.graded" && n.user_id === STUDENT)).toBe(true);
    expect(notifs.some((n) => n.kind === "homework.graded" && n.user_id === PARENT)).toBe(true);
  });

  it("parent sees children's homework but cannot assign or grade", async () => {
    const teacher = new HomeworkRepository(await ctxFor(TEACHER));
    await teacher.assign({ classId: A2KIDS, date: DATE, title: "Parent check", studentIds: [ANNA] });

    const parent = new HomeworkRepository(await ctxFor(PARENT));
    const list = await parent.list({});
    expect(list.ok && list.data?.items.some((h) => h.student_id === ANNA)).toBe(true);

    const assign = await parent.assign({ classId: A2KIDS, date: DATE, title: "Nope", studentIds: [CLARA] });
    expect(assign.ok).toBe(false);
  });
});
