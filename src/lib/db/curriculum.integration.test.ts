/**
 * Integration test for Phase 18 curriculum & learning against the local
 * PostgreSQL harness (skips when unreachable): spine authoring → topic →
 * evidence → progress → curricula publish/archive lifecycle, plus role
 * visibility and write-denial. Cleans up after itself.
 */
import { afterAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { fetchProfileFor } from "@/lib/auth/local-db";
import { PgAdapter } from "./pg-adapter";
import { CurriculumRepository } from "./repos/curriculum";
import type { DbContext } from "./context";

const dbUrl = process.env.LOCAL_DB_URL ?? "postgres://fsms:fsms_dev@127.0.0.1:5432/fsms_v2";

const OWNER = "00000000-0000-0000-0000-000000000201";
const TEACHER = "00000000-0000-0000-0000-000000000202";
const PARENT = "00000000-0000-0000-0000-000000000203";
const STUDENT = "00000000-0000-0000-0000-000000000204";
const ANNA = "00000000-0000-0000-0000-000000000401";

const CODES = {
  programme: "PH18-IT-PRG",
  unit: "PH18-IT-U",
  lesson: "PH18-IT-L",
  objective: "PH18-IT-O",
  topic: "PH18-IT-TOPIC",
  curriculum: "PH18-IT-CUR",
};
const CLS = "00000000-0000-0000-0000-000000000501";

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
    await c.query("delete from public.learning_evidence where note = 'phase18-integration'");
    await c.query(
      "delete from public.curriculum_assignments where curriculum_id in (select id from public.curricula where title @> '{\"en\":\"PH18-IT-CUR\"}')",
    );
    await c.query(
      "delete from public.curriculum_versions where curriculum_id in (select id from public.curricula where title @> '{\"en\":\"PH18-IT-CUR\"}')",
    );
    await c.query("delete from public.curricula where title @> '{\"en\":\"PH18-IT-CUR\"}'");
    await c.query("delete from public.curriculum_topics where title @> '{\"en\":\"PH18-IT-TOPIC\"}'");
    await c.query("delete from public.objectives where lower(stable_id) = 'ph18-it-o'");
    await c.query("delete from public.lessons where lower(stable_id) = 'ph18-it-l'");
    await c.query("delete from public.units where lower(stable_id) = 'ph18-it-u'");
    await c.query("delete from public.programmes where lower(stable_id) = 'ph18-it-prg'");
    await c.query("set session_replication_role = default");
  } finally {
    await c.end();
  }
});

describe.skipIf(!reachable)("curriculum (integration)", () => {
  it("lifecycle: author spine → topic → evidence → progress → curricula publish/archive", async () => {
    const owner = new CurriculumRepository(await ctxFor(OWNER));
    const teacher = new CurriculumRepository(await ctxFor(TEACHER));

    // spine authoring
    const prg = await owner.saveProgramme({
      name: "PH18 IT Programme",
      code: CODES.programme,
      type: "course",
      standard: true,
    });
    expect(prg.ok && prg.data?.id).toBeTruthy();
    const prgId = prg.ok ? prg.data!.id : null;

    const unit = await owner.saveUnit({ programmeId: prgId!, title: "PH18 IT Unit", code: CODES.unit, no: 1 });
    expect(unit.ok && unit.data?.id).toBeTruthy();
    const unitId = unit.ok ? unit.data!.id : null;

    const lesson = await owner.saveLesson({ unitId: unitId!, title: "PH18 IT Lesson", code: CODES.lesson, no: 1 });
    expect(lesson.ok && lesson.data?.id).toBeTruthy();
    const lessonId = lesson.ok ? lesson.data!.id : null;

    const objective = await owner.saveObjective({
      lessonId: lessonId!,
      text: "Can greet people and introduce themselves.",
      code: CODES.objective,
      cefr: "a2",
    });
    expect(objective.ok && objective.data?.id).toBeTruthy();

    // topic (published)
    const topic = await owner.saveTopic({
      title: CODES.topic,
      levelCode: "a2",
      courseSection: "writing",
      published: true,
    });
    expect(topic.ok && topic.data?.published).toBe(true);

    // evidence against a real target
    const targets = await teacher.targets();
    const targetId = targets.ok && targets.data.length > 0 ? targets.data[0].id : null;
    expect(targetId).toBeTruthy();
    const ev = await teacher.saveEvidence({
      studentId: ANNA,
      targetId: targetId!,
      score: 85,
      quality: "strong",
      note: "phase18-integration",
    });
    expect(ev.ok && ev.data?.id).toBeTruthy();

    // evidence list + progress
    const list = await teacher.evidenceList({ studentId: ANNA });
    expect(list.ok && list.data.total).toBeGreaterThanOrEqual(1);
    const progress = await teacher.learnerProgress({ studentId: ANNA });
    expect(progress.ok && progress.data?.student?.id).toBe(ANNA);

    // curricula container lifecycle
    const imp = await owner.importCurriculum({
      programmeId: prgId!,
      title: CODES.curriculum,
      publisher: "IT",
      payload: '{"units":[{"title":"u1"}]}',
    });
    expect(imp.ok && imp.data?.status).toBe("draft");
    const curId = imp.ok ? imp.data!.id : null;

    const pub = await owner.publishCurriculum({ curriculumId: curId! });
    expect(pub.ok && pub.data?.status).toBe("published");

    const arch = await owner.archiveCurriculum({ curriculumId: curId! });
    expect(arch.ok && arch.data?.status).toBe("archived");
  });

  it("governance lifecycle: edit → review → publish → assign → duplicate → unpublish → delete → restore → purge", async () => {
    const owner = new CurriculumRepository(await ctxFor(OWNER));
    const teacher = new CurriculumRepository(await ctxFor(TEACHER));

    const imp = await owner.importCurriculum({
      title: CODES.curriculum,
      publisher: "IT",
      payload: '{"units":[{"title":"gov"}]}',
    });
    expect(imp.ok && imp.data?.status).toBe("draft");
    const curId = imp.ok ? imp.data!.id : null;

    // edit title/publisher
    const edited = await owner.saveCurriculum({ curriculumId: curId!, title: "PH18-IT-CUR-2", publisher: "IT-2" });
    expect(edited.ok && edited.data?.publisher).toBe("IT-2");

    // teacher denied edit (saveCurriculum is admin/manager)
    const tEdit = await teacher.saveCurriculum({ curriculumId: curId!, title: "hax" });
    expect(tEdit.ok).toBe(false);

    // submit review
    const rev = await owner.submitReview({ curriculumId: curId! });
    expect(rev.ok && rev.data?.status).toBe("review");

    // publish then assign to class
    const pub = await owner.publishCurriculum({ curriculumId: curId! });
    expect(pub.ok && pub.data?.status).toBe("published");
    const assign = await owner.assignCurriculum({ curriculumId: curId!, classId: CLS });
    expect(assign.ok && assign.data?.is_primary).toBe(true);

    // duplicate → draft copy
    const dup = await owner.duplicateCurriculum({ curriculumId: curId!, title: "PH18-IT-CUR-COPY" });
    expect(dup.ok && dup.data?.status).toBe("draft");
    const dupId = dup.ok ? dup.data!.id : null;

    // unpublish → draft
    const unpub = await owner.unpublishCurriculum({ curriculumId: curId! });
    expect(unpub.ok && unpub.data?.status).toBe("draft");

    // delete (soft) → restore
    const del = await owner.deleteCurriculum({ curriculumId: curId! });
    expect(del.ok && del.data?.deleted_at).toBeTruthy();
    const restored = await owner.restoreCurriculum({ curriculumId: curId! });
    expect(restored.ok && restored.data?.deleted_at).toBeNull();

    // permanent delete requires soft-delete: the live duplicate must be rejected
    const permLive = await owner.permanentlyDeleteCurriculum({ curriculumId: dupId! });
    expect(permLive.ok && permLive.data).toBeNull();

    // soft-delete both, then purge
    await owner.deleteCurriculum({ curriculumId: curId! });
    await owner.deleteCurriculum({ curriculumId: dupId! });
    const purged = await owner.permanentlyDeleteCurriculum({ curriculumId: dupId! });
    expect(purged.ok && purged.data?.id).toBe(dupId);
    const purgedMain = await owner.permanentlyDeleteCurriculum({ curriculumId: curId! });
    expect(purgedMain.ok && purgedMain.data?.id).toBe(curId);
  });

  it("role visibility and write denial", async () => {
    const teacher = new CurriculumRepository(await ctxFor(TEACHER));
    const parent = new CurriculumRepository(await ctxFor(PARENT));
    const student = new CurriculumRepository(await ctxFor(STUDENT));

    // teacher denied spine authoring (leadership only)
    const deniedAuthor = await teacher.saveProgramme({ name: "X" });
    expect(deniedAuthor.ok).toBe(false);

    // parent sees published topics
    const topics = await parent.topics({});
    expect(topics.ok).toBe(true);

    // student denied evidence write; student sees own progress
    const studentWrite = await student.saveEvidence({
      studentId: ANNA,
      targetId: "00000000-0000-0000-0000-000000000801",
    });
    expect(studentWrite.ok).toBe(false);

    const studentProgress = await student.learnerProgress({ studentId: ANNA });
    expect(studentProgress.ok && studentProgress.data?.student?.id).toBe(ANNA);
  });
});
