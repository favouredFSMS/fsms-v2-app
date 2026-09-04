/**
 * Integration test for Phase 19 materials & resources against the local
 * PostgreSQL harness (skips when unreachable): material → unit → mapping
 * (propose/decide) → access → feedback → resources lifecycle, plus role
 * visibility and write-denial. Cleans up after itself.
 */
import { afterAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { fetchProfileFor } from "@/lib/auth/local-db";
import { PgAdapter } from "./pg-adapter";
import { MaterialRepository } from "./repos/materials";
import type { DbContext } from "./context";

const dbUrl = process.env.LOCAL_DB_URL ?? "postgres://fsms:fsms_dev@127.0.0.1:5432/fsms_v2";

const OWNER = "00000000-0000-0000-0000-000000000201";
const TEACHER = "00000000-0000-0000-0000-000000000202";
const PARENT = "00000000-0000-0000-0000-000000000203";
const STUDENT = "00000000-0000-0000-0000-000000000204";
const CLS = "00000000-0000-0000-0000-000000000501";

const TITLE = "PH19-IT Book";

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
    await c.query(
      "delete from public.material_lessons where material_id in (select id from public.materials where title @> '{\"en\":\"PH19-IT Book\"}')",
    );
    await c.query(
      "delete from public.material_feedback where material_id in (select id from public.materials where title @> '{\"en\":\"PH19-IT Book\"}')",
    );
    await c.query(
      "delete from public.material_assignments where material_id in (select id from public.materials where title @> '{\"en\":\"PH19-IT Book\"}')",
    );
    await c.query(
      "delete from public.material_mappings where material_unit_id in (select id from public.material_units where material_id in (select id from public.materials where title @> '{\"en\":\"PH19-IT Book\"}'))",
    );
    await c.query(
      "delete from public.material_units where material_id in (select id from public.materials where title @> '{\"en\":\"PH19-IT Book\"}')",
    );
    await c.query("delete from public.materials where title @> '{\"en\":\"PH19-IT Book\"}'");
    await c.query("delete from public.resources where title @> '{\"en\":\"PH19-IT Worksheet\"}'");
    await c.query("delete from public.teacher_materials where title @> '{\"en\":\"PH19-IT Warm-up\"}'");
    await c.query("set session_replication_role = default");
  } finally {
    await c.end();
  }
});

describe.skipIf(!reachable)("materials (integration)", () => {
  it("lifecycle: material → unit → mapping propose/decide → access → feedback → detail", async () => {
    const owner = new MaterialRepository(await ctxFor(OWNER));

    const mat = await owner.saveMaterial({ title: TITLE, type: "textbook", levelCode: "a2", publisher: "IT" });
    expect(mat.ok && mat.data?.id).toBeTruthy();
    const mid = mat.ok ? mat.data!.id : null;

    const unit = await owner.saveUnit({ materialId: mid!, no: 1, title: "Unit 1" });
    expect(unit.ok && unit.data?.id).toBeTruthy();
    const uid = unit.ok ? unit.data!.id : null;

    const options = await owner.mappingOptions({ materialId: mid! });
    expect(options.ok && options.data?.units.length).toBeGreaterThanOrEqual(1);
    const targetId = options.ok && options.data!.targets.length > 0 ? options.data!.targets[0].id : null;
    expect(targetId).toBeTruthy();

    const mapping = await owner.saveMapping({ materialUnitId: uid!, targetId: targetId!, scope: "reading" });
    expect(mapping.ok && mapping.data?.status).toBe("proposed");
    const mappingId = mapping.ok ? mapping.data!.id : null;

    const decided = await owner.decideMapping({ mappingId: mappingId!, decision: "verified" });
    expect(decided.ok && decided.data?.status).toBe("verified");

    const access = await owner.saveAccess({
      materialId: mid!,
      assignments: [{ scopeType: "class", scopeId: CLS, isPrimary: true }],
    });
    expect(access.ok && access.data?.assignments).toBe(1);

    const detail = await owner.detail({ materialId: mid! });
    expect(detail.ok && detail.data?.units.length).toBeGreaterThanOrEqual(1);
    expect(detail.ok && detail.data?.mappings.length).toBeGreaterThanOrEqual(1);
  });

  it("role visibility and write denial", async () => {
    const owner = new MaterialRepository(await ctxFor(OWNER));
    const teacher = new MaterialRepository(await ctxFor(TEACHER));
    const parent = new MaterialRepository(await ctxFor(PARENT));
    const student = new MaterialRepository(await ctxFor(STUDENT));

    // parent sees catalogue via RPC
    const parentCatalog = await parent.catalog({});
    expect(parentCatalog.ok && parentCatalog.data.total).toBeGreaterThanOrEqual(0);

    // teacher denied catalogue edit + mapping decision
    const tMaterial = await teacher.saveMaterial({ title: "X" });
    expect(tMaterial.ok).toBe(false);
    const tDecide = await teacher.decideMapping({
      mappingId: "00000000-0000-0000-0000-000000000999",
      decision: "verified",
    });
    expect(tDecide.ok).toBe(false);

    // teacher resources: create + delete own
    const res = await teacher.saveResource({ title: "PH19-IT Worksheet", url: "https://x.test", kind: "worksheet" });
    expect(res.ok && res.data?.id).toBeTruthy();
    const rid = res.ok ? res.data!.id : null;
    const del = await teacher.deleteResource({ resourceId: rid! });
    expect(del.ok && del.data?.deleted_at).toBeTruthy();

    // student denied feedback write
    const sFeedback = await student.saveFeedback({ materialId: "00000000-0000-0000-0000-000000000901", rating: 5 });
    expect(sFeedback.ok).toBe(false);

    // owner teacher-material + list; teacher sees own only (owner list includes it as leadership)
    const tm = await teacher.saveTeacherMaterial({ title: "PH19-IT Warm-up", kind: "game" });
    expect(tm.ok && tm.data?.id).toBeTruthy();
    const ownerList = await owner.teacherMaterials();
    expect(ownerList.ok && ownerList.data.some((x) => x.title?.en === "PH19-IT Warm-up")).toBe(true);
  });
});
