import { describe, expect, it } from "vitest";
import { ReportingRepository } from "./reporting";
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
      "studentProgressReport",
      "learnerProgressOverview",
      "attendanceSheet",
      "performance",
      "report",
      "salaryHistory",
    ],
  });

const student = (): AuthProfile =>
  profile({
    role_base: "student",
    role_key: "student",
    role_label: "Student",
    rank: 0,
    permissions: ["studentProgressReport", "report"],
  });

const ctx = (adapter: ReturnType<typeof fakeAdapter>, p = profile()): DbContext => ({ profile: p, db: adapter });

const CLS = "00000000-0000-0000-0000-000000000501";
const STU = "00000000-0000-0000-0000-000000000401";

describe("ReportingRepository", () => {
  it("attendanceReport passes class/from/to through", async () => {
    let fn = "";
    let args: Record<string, unknown> | undefined;
    const adapter = fakeAdapter({
      async rpc<T>(n: string, a?: Record<string, unknown>) {
        fn = n;
        args = a;
        return { data: { class: null, range: {}, students: [] } as T, error: null };
      },
    });
    const res = await new ReportingRepository(ctx(adapter, teacher())).attendanceReport({
      classId: CLS,
      from: "2026-09-01",
      to: "2026-09-30",
    });
    expect(res.ok).toBe(true);
    expect(fn).toBe("attendance_report");
    expect(args).toEqual({ p_class: CLS, p_from: "2026-09-01", p_to: "2026-09-30" });
  });

  it("studentProgressReport passes the student id", async () => {
    let args: Record<string, unknown> | undefined;
    const adapter = fakeAdapter({
      async rpc<T>(_n: string, a?: Record<string, unknown>) {
        args = a;
        return { data: null as T, error: null };
      },
    });
    await new ReportingRepository(ctx(adapter, student())).studentProgressReport({ studentId: STU });
    expect(args).toEqual({ p_student: STU });
  });

  it("requestExport passes kind + params", async () => {
    let args: Record<string, unknown> | undefined;
    const adapter = fakeAdapter({
      async rpc<T>(_n: string, a?: Record<string, unknown>) {
        args = a;
        return { data: { id: "j1", kind: "attendance", status: "queued", created_at: "2026-09-04" } as T, error: null };
      },
    });
    const res = await new ReportingRepository(ctx(adapter, teacher())).requestExport({
      kind: "attendance",
      params: { classId: CLS },
    });
    expect(res.ok).toBe(true);
    expect(args).toEqual({ p_kind: "attendance", p_params: { classId: CLS } });
  });

  it("teacher is denied curriculumCoverage (RBAC pre-check)", async () => {
    const res = await new ReportingRepository(ctx(fakeAdapter(), teacher())).curriculumCoverage({ classId: CLS });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("forbidden");
  });

  it("student is denied learnerProgressOverview (RBAC pre-check)", async () => {
    const res = await new ReportingRepository(ctx(fakeAdapter(), student())).learnerProgressOverview({ classId: CLS });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("forbidden");
  });

  it("teacher is denied classEarnings (RBAC pre-check)", async () => {
    const res = await new ReportingRepository(ctx(fakeAdapter(), teacher())).classEarnings({});
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("forbidden");
  });

  it("processExports calls report_export_process", async () => {
    let fn = "";
    const adapter = fakeAdapter({
      async rpc<T>(n: string) {
        fn = n;
        return { data: { processed: 2 } as T, error: null };
      },
    });
    const res = await new ReportingRepository(ctx(adapter)).processExports();
    expect(res.ok).toBe(true);
    expect(fn).toBe("report_export_process");
    if (res.ok) expect(res.data?.processed).toBe(2);
  });

  it("invalid month is rejected at the schema layer", async () => {
    const res = await new ReportingRepository(ctx(fakeAdapter(), teacher())).salaryHistory({ month: "2026-13" });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe("invalid_input");
  });
});
