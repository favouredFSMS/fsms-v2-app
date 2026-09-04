import { describe, expect, it } from "vitest";
import { MaterialRepository } from "./materials";
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
    permissions: [
      "materialCatalog",
      "saveMaterialFeedback",
      "saveResource",
      "deleteResource",
      "saveTeacherMaterial",
      "searchTeachingMaterials",
      "resources",
      "methodology",
    ],
  });

const student = (): AuthProfile =>
  profile({
    role_base: "student",
    role_key: "student",
    role_label: "Student",
    rank: 0,
    permissions: ["materialCatalog", "resources"],
  });

const ctx = (adapter: ReturnType<typeof fakeAdapter>, p = profile()): DbContext => ({ profile: p, db: adapter });

const MID = "00000000-0000-0000-0000-000000000901";
const UID = "00000000-0000-0000-0000-000000000902";
const TID = "00000000-0000-0000-0000-000000000801";

describe("MaterialRepository", () => {
  it("catalog maps rows to a Page", async () => {
    const adapter = fakeAdapter({
      async rpc<T>() {
        return { data: { rows: [{ id: "m1", type: "textbook" }], total: 1, next_cursor: null } as T, error: null };
      },
    });
    const res = await new MaterialRepository(ctx(adapter, student())).catalog({});
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.total).toBe(1);
  });

  it("saveMaterial enforces saveMaterial (teacher lacks it)", async () => {
    const denied = await new MaterialRepository(ctx(fakeAdapter(), teacher())).saveMaterial({ title: "B" });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error.code).toBe("forbidden");
  });

  it("saveMaterial passes args through", async () => {
    let args: Record<string, unknown> | undefined;
    const adapter = fakeAdapter({
      async rpc<T>(_n: string, a?: Record<string, unknown>) {
        args = a;
        return { data: { id: "m1" } as T, error: null };
      },
    });
    const res = await new MaterialRepository(ctx(adapter)).saveMaterial({
      title: "Book",
      type: "textbook",
      levelCode: "a2",
      isbn: "ISBN-1",
    });
    expect(res.ok).toBe(true);
    expect(args?.p_title).toBe("Book");
    expect(args?.p_type).toBe("textbook");
    expect(args?.p_isbn).toBe("ISBN-1");
  });

  it("saveMapping enforces saveMaterialMapping", async () => {
    const denied = await new MaterialRepository(ctx(fakeAdapter(), teacher())).saveMapping({
      materialUnitId: UID,
      targetId: TID,
    });
    expect(denied.ok).toBe(false);
  });

  it("saveMapping passes unit/target through", async () => {
    let args: Record<string, unknown> | undefined;
    const adapter = fakeAdapter({
      async rpc<T>(_n: string, a?: Record<string, unknown>) {
        args = a;
        return { data: { id: "mp1", status: "proposed" } as T, error: null };
      },
    });
    const res = await new MaterialRepository(ctx(adapter)).saveMapping({
      materialUnitId: UID,
      targetId: TID,
      scope: "reading",
    });
    expect(res.ok).toBe(true);
    expect(args?.p_material_unit).toBe(UID);
    expect(args?.p_target).toBe(TID);
  });

  it("decideMapping enforces decideMaterialMapping (teacher lacks it)", async () => {
    const denied = await new MaterialRepository(ctx(fakeAdapter(), teacher())).decideMapping({
      mappingId: "00000000-0000-0000-0000-000000000999",
      decision: "verified",
    });
    expect(denied.ok).toBe(false);
  });

  it("saveAccess serializes assignments as JSON", async () => {
    let args: Record<string, unknown> | undefined;
    const adapter = fakeAdapter({
      async rpc<T>(_n: string, a?: Record<string, unknown>) {
        args = a;
        return { data: { material_id: MID, assignments: 1 } as T, error: null };
      },
    });
    const res = await new MaterialRepository(ctx(adapter)).saveAccess({
      materialId: MID,
      assignments: [{ scopeType: "class", scopeId: "00000000-0000-0000-0000-000000000501" }],
    });
    expect(res.ok).toBe(true);
    expect(JSON.parse(args?.p_assignments as string)).toEqual([
      { scopeType: "class", scopeId: "00000000-0000-0000-0000-000000000501" },
    ]);
  });

  it("saveResource enforces saveResource (student lacks it)", async () => {
    const denied = await new MaterialRepository(ctx(fakeAdapter(), student())).saveResource({ title: "W" });
    expect(denied.ok).toBe(false);
  });

  it("deleteResource enforces deleteResource", async () => {
    const denied = await new MaterialRepository(ctx(fakeAdapter(), student())).deleteResource({
      resourceId: "00000000-0000-0000-0000-000000000999",
    });
    expect(denied.ok).toBe(false);
  });

  it("saveTeacherMaterial rejects invalid JSON payload", async () => {
    const res = await new MaterialRepository(ctx(fakeAdapter(), teacher())).saveTeacherMaterial({
      title: "TM",
      payload: "{bad",
    });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("invalid_input");
  });

  it("saveTeacherMaterial passes payload through", async () => {
    let args: Record<string, unknown> | undefined;
    const adapter = fakeAdapter({
      async rpc<T>(_n: string, a?: Record<string, unknown>) {
        args = a;
        return { data: { id: "tm1" } as T, error: null };
      },
    });
    const res = await new MaterialRepository(ctx(adapter, teacher())).saveTeacherMaterial({
      title: "Warm-up",
      kind: "game",
      payload: '{"duration":"5 min"}',
    });
    expect(res.ok).toBe(true);
    expect(JSON.parse(args?.p_payload as string)).toEqual({ duration: "5 min" });
  });

  it("saveFeedback enforces saveMaterialFeedback (student lacks it)", async () => {
    const denied = await new MaterialRepository(ctx(fakeAdapter(), student())).saveFeedback({
      materialId: MID,
      rating: 5,
    });
    expect(denied.ok).toBe(false);
  });

  it("saveFeedback passes rating through", async () => {
    let args: Record<string, unknown> | undefined;
    const adapter = fakeAdapter({
      async rpc<T>(_n: string, a?: Record<string, unknown>) {
        args = a;
        return { data: { id: "f1", rating: "5" } as T, error: null };
      },
    });
    const res = await new MaterialRepository(ctx(adapter, teacher())).saveFeedback({
      materialId: MID,
      rating: 4,
      note: "good",
    });
    expect(res.ok).toBe(true);
    expect(args?.p_rating).toBe(4);
  });

  it("saveUpload passes args through", async () => {
    let args: Record<string, unknown> | undefined;
    const adapter = fakeAdapter({
      async rpc<T>(_n: string, a?: Record<string, unknown>) {
        args = a;
        return { data: { id: "up1" } as T, error: null };
      },
    });
    const res = await new MaterialRepository(ctx(adapter)).saveUpload({
      storagePath: "x/file.pdf",
      bucket: "materials",
      mime: "application/pdf",
      sizeBytes: 123,
    });
    expect(res.ok).toBe(true);
    expect(args?.p_bucket).toBe("materials");
    expect(args?.p_size_bytes).toBe(123);
  });
});
