import { describe, expect, it } from "vitest";
import { NAV_SECTIONS, visibleNavSections, type NavItem } from "./nav";

describe("nav model", () => {
  it("has unique hrefs", () => {
    const hrefs = NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.href));
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("every item has a label and icon", () => {
    for (const s of NAV_SECTIONS) {
      for (const i of s.items) {
        expect(i.label.length).toBeGreaterThan(0);
        expect(i.icon.length).toBeGreaterThan(0);
      }
    }
  });

  it("dashboard item requires the dashboard permission", () => {
    const dash = NAV_SECTIONS[0].items[0];
    expect(dash.permission).toBe("dashboard");
  });
});

describe("visibleNavSections", () => {
  const allowAll = () => true;
  const denyAll = () => false;

  const sample: NavItem[] = [
    { href: "/a", label: "A", icon: "admin", permission: "admin" },
    { href: "/b", label: "B", icon: "bell" }, // ungated → always visible
    { href: "/c", label: "C", icon: "check", permission: "classes" },
  ];

  it("keeps ungated items and granted items", () => {
    const can = (a: string) => a === "admin";
    const out = visibleNavSections([{ title: "T", items: sample }], can);
    const labels = out[0].items.map((i) => i.label);
    expect(labels).toEqual(["A", "B"]);
  });

  it("fail-closed: denies everything when no permissions", () => {
    const out = visibleNavSections([{ title: "T", items: sample }], denyAll);
    expect(out[0].items.map((i) => i.label)).toEqual(["B"]);
  });

  it("shows everything for a wildcard holder", () => {
    const out = visibleNavSections([{ title: "T", items: sample }], allowAll);
    expect(out[0].items).toHaveLength(3);
  });

  it("drops empty sections", () => {
    const out = visibleNavSections([{ title: "T", items: sample }], denyAll);
    expect(out).toHaveLength(1); // "B" remains
    const out2 = visibleNavSections(
      [{ title: "T", items: [{ href: "/x", label: "X", icon: "check", permission: "admin" }] }],
      denyAll,
    );
    expect(out2).toHaveLength(0);
  });
});
