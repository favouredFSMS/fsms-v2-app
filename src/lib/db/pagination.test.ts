import { describe, expect, it } from "vitest";
import { emptyPage, type Page } from "./pagination";

describe("Page helpers", () => {
  it("emptyPage returns a well-formed empty page", () => {
    const p = emptyPage<string>();
    expect(p).toEqual({ items: [], total: 0, nextCursor: null });
  });

  it("pages carry items, total and an opaque next cursor", () => {
    const p: Page<string> = {
      items: ["a", "b"],
      total: 7,
      nextCursor: "opaque-cursor-token",
    };
    expect(p.total).toBe(7);
    expect(p.nextCursor).toBeTruthy();
  });
});
