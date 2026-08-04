import { describe, expect, it } from "vitest";
import {
  daysTogetherFromStartDate,
  neighborsFromOrderedList,
} from "@/features/memories/published";

describe("daysTogetherFromStartDate", () => {
  it("counts the meet day as day 1", () => {
    expect(daysTogetherFromStartDate("2024-12-20", new Date(2024, 11, 20))).toBe(1);
  });

  it("counts inclusive days to 2026-08-04 from 2024-12-20", () => {
    expect(daysTogetherFromStartDate("2024-12-20", new Date(2026, 7, 4))).toBe(593);
  });
});

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
