import { describe, it, expect } from "vitest";
import {
  rankOf,
  outranks,
  isSuperuser,
  isLeadership,
  isStaff,
  isOffice,
  isMoneyRole,
  isFinance,
  needsApproval,
  STAFF_ROLES,
  LEADERSHIP,
  MONEY_ROLES,
} from "./roles";

describe("roles", () => {
  it("mirrors V101 BUILTIN_RANK", () => {
    expect(rankOf("admin1")).toBe(200);
    expect(rankOf("admin")).toBe(100);
    expect(rankOf("manager")).toBe(80);
    expect(rankOf("accountant")).toBe(60);
    expect(rankOf("secretary")).toBe(55);
    expect(rankOf("teacher")).toBe(50);
    expect(rankOf("parent")).toBe(20);
    expect(rankOf("student")).toBe(10);
    expect(rankOf(null)).toBe(0);
  });

  it("outranks is strict", () => {
    expect(outranks("admin1", "admin")).toBe(true);
    expect(outranks("admin", "manager")).toBe(true);
    expect(outranks("manager", "admin")).toBe(false);
    expect(outranks("teacher", "teacher")).toBe(false);
  });

  it("group memberships match V101", () => {
    expect(STAFF_ROLES).toEqual(["admin1", "admin", "manager", "accountant", "secretary", "teacher"]);
    expect(LEADERSHIP).toEqual(["admin1", "admin", "manager"]);
    expect(MONEY_ROLES).toEqual(["admin1", "admin", "manager", "accountant"]);

    expect(isStaff("teacher")).toBe(true);
    expect(isStaff("parent")).toBe(false);
    expect(isLeadership("manager")).toBe(true);
    expect(isLeadership("secretary")).toBe(false);
    expect(isOffice("secretary")).toBe(true);
    expect(isOffice("accountant")).toBe(false);
    expect(isMoneyRole("accountant")).toBe(true);
    expect(isMoneyRole("secretary")).toBe(false);
    expect(isFinance("secretary")).toBe(true); // money + secretary
    expect(isFinance("accountant")).toBe(true);
    expect(isFinance("teacher")).toBe(false);
    expect(isSuperuser("admin1")).toBe(true);
    expect(isSuperuser("admin")).toBe(false);
    expect(needsApproval("secretary")).toBe(true);
    expect(needsApproval("teacher")).toBe(false);
  });
});
