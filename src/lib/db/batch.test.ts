import { describe, expect, it } from "vitest";
import { chunk, inBatches } from "./batch";

describe("chunk", () => {
  it("splits into fixed-size batches", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("handles empty input", () => {
    expect(chunk([], 10)).toEqual([]);
  });

  it("uses the default batch size", () => {
    const items = Array.from({ length: 250 }, (_, i) => i);
    expect(chunk(items)).toHaveLength(3);
    expect(chunk(items)[0]).toHaveLength(100);
  });
});

describe("inBatches", () => {
  it("chains batches in order and concatenates results", async () => {
    const calls: number[][] = [];
    const result = await inBatches([1, 2, 3, 4, 5], async (b) => {
      calls.push(b);
      return b.map((n) => n * 10);
    }, 2);
    expect(result).toEqual([10, 20, 30, 40, 50]);
    expect(calls).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns [] for empty input without invoking the callback", async () => {
    let called = false;
    const result = await inBatches([], async () => {
      called = true;
      return [];
    });
    expect(result).toEqual([]);
    expect(called).toBe(false);
  });
});
