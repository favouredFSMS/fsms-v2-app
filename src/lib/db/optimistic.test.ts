import { describe, expect, it } from "vitest";
import { mergeById, upsertById, removeById, prependItem } from "./optimistic";

const rows = [
  { id: "a", n: 1 },
  { id: "b", n: 2 },
  { id: "c", n: 3 },
];

describe("optimistic list helpers", () => {
  it("mergeById updates the matching item in place", () => {
    expect(mergeById(rows, { id: "b", n: 20 })).toEqual([
      { id: "a", n: 1 },
      { id: "b", n: 20 },
      { id: "c", n: 3 },
    ]);
  });

  it("upsertById inserts when the id is absent", () => {
    expect(upsertById(rows, { id: "z", n: 9 })).toHaveLength(4);
    expect(upsertById(rows, { id: "a", n: 99 })[0].n).toBe(99);
  });

  it("removeById filters the item out", () => {
    expect(removeById(rows, "b")).toEqual([
      { id: "a", n: 1 },
      { id: "c", n: 3 },
    ]);
  });

  it("prependItem adds to the front without duplicating", () => {
    expect(prependItem(rows, { id: "b", n: 200 })[0]).toEqual({ id: "b", n: 200 });
    expect(prependItem(rows, { id: "b", n: 200 })).toHaveLength(3);
    expect(prependItem(rows, { id: "z", n: 0 })).toHaveLength(4);
  });
});
