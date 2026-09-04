import { describe, expect, it } from "vitest";
import { paginationRange, paginationSummary } from "./pagination";

describe("paginationRange", () => {
  it("single page", () => {
    expect(paginationRange(1, 1).items).toEqual([1]);
  });

  it("small range has no ellipsis", () => {
    expect(paginationRange(2, 5).items).toEqual([1, 2, 3, 4, 5]);
  });

  it("middle page shows ellipsis on both sides", () => {
    const r = paginationRange(50, 100);
    expect(r.items).toEqual([1, "…", 49, 50, 51, "…", 100]);
    expect(r.previousJump).toBe(48);
    expect(r.nextJump).toBe(52);
  });

  it("early page ellipsizes only the tail", () => {
    const r = paginationRange(2, 100);
    expect(r.items).toEqual([1, 2, 3, "…", 100]);
    expect(r.previousJump).toBeNull();
  });

  it("clamps out-of-range page", () => {
    expect(paginationRange(999, 10).items).toContain(10);
    expect(paginationRange(0, 10).items).toContain(1);
  });

  it("treats pageCount < 1 as one page", () => {
    expect(paginationRange(1, 0).items).toEqual([1]);
  });
});

describe("paginationSummary", () => {
  it("summarises a full page", () => {
    expect(paginationSummary(1, 20, 137)).toBe("Showing 1–20 of 137");
  });

  it("summarises the last partial page", () => {
    expect(paginationSummary(7, 20, 137)).toBe("Showing 121–137 of 137");
  });

  it("summarises an empty set", () => {
    expect(paginationSummary(1, 20, 0)).toBe("Showing 0–0 of 0");
  });
});
