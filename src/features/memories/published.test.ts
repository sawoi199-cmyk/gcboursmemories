import { describe, expect, it } from "vitest";
import { neighborsFromOrderedList } from "@/features/memories/published";

describe("neighborsFromOrderedList", () => {
  const items = [
    { slug: "a", title: "A" },
    { slug: "b", title: "B" },
    { slug: "c", title: "C" },
  ];

  it("returns prev and next for a middle item", () => {
    expect(neighborsFromOrderedList(items, "b")).toEqual({
      index: 1,
      prev: items[0],
      next: items[2],
    });
  });

  it("returns null prev for the first item", () => {
    expect(neighborsFromOrderedList(items, "a")).toEqual({
      index: 0,
      prev: null,
      next: items[1],
    });
  });

  it("returns -1 when slug is missing", () => {
    expect(neighborsFromOrderedList(items, "missing").index).toBe(-1);
  });
});
