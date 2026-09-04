import { describe, it, expect } from "vitest";
import { hasPermission, profileCan, canManage, allowedRolesFor } from "./authorize";
import type { AuthProfile } from "./types";

const profile = (over: Partial<AuthProfile>): AuthProfile => ({
  id: "u1",
  school_id: "s1",
  email: null,
  name: null,
  role_id: null,
  role_base: "teacher",
  role_key: "teacher",
  role_label: "Teacher",
  rank: 50,
  locale: "en",
  notify_lang: "en",
  status: "active",
  must_change_password: false,
  linked_ids: [],
  permissions: ["dashboard", "saveHomework"],
  ...over,
});

describe("authorize", () => {
  it("fails closed with no principal", () => {
    expect(hasPermission(null, "dashboard")).toBe(false);
    expect(hasPermission(undefined, "dashboard")).toBe(false);
    expect(profileCan(null, "dashboard")).toBe(false);
  });

  it("admin1 is a wildcard regardless of the permission list", () => {
    expect(hasPermission({ role_base: "admin1", permissions: [] }, "anything")).toBe(true);
  });

  it("honours the '*' wildcard for custom roles", () => {
    expect(hasPermission({ role_base: "teacher", permissions: ["*"] }, "anything")).toBe(true);
  });

  it("checks the explicit permission list", () => {
    const p = profile({ permissions: ["dashboard", "saveHomework"] });
    expect(profileCan(p, "dashboard")).toBe(true);
    expect(profileCan(p, "saveHomework")).toBe(true);
    expect(profileCan(p, "saveStudent")).toBe(false);
  });

  it("canManage respects rank", () => {
    expect(canManage({ role_base: "admin1" }, "admin")).toBe(true);
    expect(canManage({ role_base: "admin" }, "manager")).toBe(true);
    expect(canManage({ role_base: "manager" }, "admin")).toBe(false);
    expect(canManage(null, "student")).toBe(false);
  });

  it("allowedRolesFor exposes the catalog", () => {
    expect(allowedRolesFor("submitHomework")).toEqual(["parent", "student"]);
  });
});
