import { describe, it, expect } from "vitest";
import {
  PERMISSION_CATALOG,
  PERMISSION_COUNT,
  ROLE_PERMISSIONS,
  BUILTIN_ROLES,
  BUILTIN_RANK,
} from "./permissions";

describe("permission catalog (derived from V101 Auth.gs)", () => {
  it("carries the complete V101 action set", () => {
    expect(PERMISSION_COUNT).toBe(337);
    expect(Object.keys(PERMISSION_CATALOG)).toHaveLength(337);
  });

  it("maps every action to at least one role", () => {
    for (const [action, entry] of Object.entries(PERMISSION_CATALOG)) {
      expect(entry.roles.length, action).toBeGreaterThan(0);
    }
  });

  it("covers the 8 built-in roles with V101 ranks", () => {
    expect(BUILTIN_ROLES).toEqual([
      "admin1",
      "admin",
      "manager",
      "accountant",
      "secretary",
      "teacher",
      "parent",
      "student",
    ]);
    expect(BUILTIN_RANK).toEqual({
      admin1: 200,
      admin: 100,
      manager: 80,
      accountant: 60,
      secretary: 55,
      teacher: 50,
      parent: 20,
      student: 10,
    });
  });

  it("admin1 is a wildcard", () => {
    expect(ROLE_PERMISSIONS.admin1).toEqual(["*"]);
  });

  it("role permission counts match the V101 catalog", () => {
    // Non-wildcard built-in roles carry exactly their catalog slice.
    expect(ROLE_PERMISSIONS.admin).toHaveLength(300);
    expect(ROLE_PERMISSIONS.manager).toHaveLength(297);
    expect(ROLE_PERMISSIONS.accountant).toHaveLength(158);
    expect(ROLE_PERMISSIONS.secretary).toHaveLength(265);
    expect(ROLE_PERMISSIONS.teacher).toHaveLength(176);
    expect(ROLE_PERMISSIONS.parent).toHaveLength(98);
    expect(ROLE_PERMISSIONS.student).toHaveLength(97);
  });

  it("spot-checks V101 semantics", () => {
    // families read, staff write
    expect(PERMISSION_CATALOG.submitHomework.roles.sort()).toEqual(["parent", "student"]);
    expect(PERMISSION_CATALOG.saveStudent.roles).not.toContain("teacher");
    expect(PERMISSION_CATALOG.saveStudent.roles).toContain("secretary");
    expect(PERMISSION_CATALOG.saveStudentProgression.roles).toEqual(["admin1"]);
    expect(PERMISSION_CATALOG.awardBadge.roles).toContain("teacher");
    expect(PERMISSION_CATALOG.saveSalary.roles).toContain("accountant");
    expect(PERMISSION_CATALOG.saveSalary.roles).not.toContain("teacher");
  });
});
