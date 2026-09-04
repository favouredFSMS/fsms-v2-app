import { describe, expect, it } from "vitest";
import { AttendanceRepository } from "./attendance";
import { fakeAdapter } from "../testing/fake-adapter";
import type { DbContext } from "../context";
import type { AuthProfile } from "@/lib/auth/types";

const owner = (over: Partial<AuthProfile> = {}): AuthProfile => ({
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

const parent = (): AuthProfile =>
  owner({ role_base: "parent", role_key: "parent", role_label: "Parent", rank: 10, permissions: ["attendanceGrid"] });

const ctx = (adapter: ReturnType<typeof fakeAdapter>, p = owner()): DbContext => ({ profile: p, db: adapter });

const SID = "00000000-0000-0000-0000-000000000401";
const CID = "00000000-0000-0000-0000-000000000501";

describe("AttendanceRepository", () => {
  it("grid maps the RPC payload", async () => {
    let fn = "";
    const adapter = fakeAdapter({
      async rpc<T>(name: string) {
        fn = name;
        return { data: { class: { id: CID, name: "A2" }, date: "2026-09-04", students: [] } as T, error: null };
      },
    });
    const res = await new AttendanceRepository(ctx(adapter)).grid({ classId: CID, date: "2026-09-04" });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data?.class?.name).toBe("A2");
    expect(fn).toBe("attendance_grid");
  });

  it("save enforces saveAttendance and validates marks", async () => {
    const adapter = fakeAdapter();
    const denied = await new AttendanceRepository(ctx(adapter, parent())).save({
      classId: CID,
      date: "2026-09-04",
      marks: [{ studentId: SID, status: "present" }],
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error.code).toBe("forbidden");

    const bad = await new AttendanceRepository(ctx(adapter)).save({
      classId: CID,
      date: "2026-09-04",
      marks: [{ studentId: SID, status: "bogus" }],
    });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.error.code).toBe("invalid_input");
  });

  it("save serializes marks to the RPC argument", async () => {
    let args: Record<string, unknown> | undefined;
    const adapter = fakeAdapter({
      async rpc<T>(_name: string, a?: Record<string, unknown>) {
        args = a;
        return { data: { saved: 1, rows: [] } as T, error: null };
      },
    });
    const res = await new AttendanceRepository(ctx(adapter)).save({
      classId: CID,
      date: "2026-09-04",
      marks: [{ studentId: SID, status: "late", minutesLate: 5, note: "bus" }],
    });
    expect(res.ok).toBe(true);
    const marks = JSON.parse(args?.p_marks as string) as Array<{ student_id: string; status: string; minutes_late: number | null }>;
    expect(marks).toHaveLength(1);
    expect(marks[0]).toMatchObject({ student_id: SID, status: "late", minutes_late: 5 });
  });

  it("history maps rows to a Page", async () => {
    const adapter = fakeAdapter({
      async rpc<T>() {
        return { data: { rows: [{ id: "a1", date: "2026-09-04", minutes_late: 0, note: null }], total: 1, next_cursor: null } as T, error: null };
      },
    });
    const res = await new AttendanceRepository(ctx(adapter)).history({ classId: CID });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data.total).toBe(1);
  });

  it("myAttendance maps the summary", async () => {
    const adapter = fakeAdapter({
      async rpc<T>() {
        return { data: { student: { id: SID, name: "Anna" }, totals: { present: 3, absent: 0, late: 1, rate: 100 }, recent: [], by_class: [] } as T, error: null };
      },
    });
    const res = await new AttendanceRepository(ctx(adapter)).myAttendance(SID);
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.data?.totals.present).toBe(3);
  });
});
