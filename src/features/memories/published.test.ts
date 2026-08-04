import { describe, expect, it } from "vitest";
import {
  daysTogetherFromStartDate,
  neighborsFromOrderedList,
  pickCoverLink,
  timelineCursorOrFilter,
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

describe("pickCoverLink", () => {
  it("prefers role=cover over first sort order", () => {
    const links = [
      {
        photo_id: "1",
        role: "detail",
        sort_order: 0,
        photos: null,
      },
      {
        photo_id: "2",
        role: "cover",
        sort_order: 1,
        photos: null,
      },
    ];
    expect(pickCoverLink(links)?.photo_id).toBe("2");
  });

  it("falls back to the first link when no cover role", () => {
    const links = [
      {
        photo_id: "1",
        role: "detail",
        sort_order: 0,
        photos: null,
      },
      {
        photo_id: "2",
        role: "hero",
        sort_order: 1,
        photos: null,
      },
    ];
    expect(pickCoverLink(links)?.photo_id).toBe("1");
  });

  it("returns null for empty list", () => {
    expect(pickCoverLink([])).toBeNull();
  });
});

describe("timelineCursorOrFilter", () => {
  it("builds a descending composite cursor filter", () => {
    expect(
      timelineCursorOrFilter({
        eventDate: "2025-06-08",
        id: "00000000-0000-4000-8000-000000000002",
      }),
    ).toBe(
      "event_date.lt.2025-06-08,and(event_date.eq.2025-06-08,id.lt.00000000-0000-4000-8000-000000000002)",
    );
  });
});
