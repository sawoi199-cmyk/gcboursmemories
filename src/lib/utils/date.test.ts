import { describe, expect, it } from "vitest";
import { formatArchiveDate, formatDottedDate, todayLocalIsoDate } from "@/lib/utils/date";

describe("formatArchiveDate", () => {
  it("formats a calendar date without shifting the day", () => {
    expect(formatArchiveDate("2026-08-09")).toEqual({
      year: "2026",
      short: "08.09",
    });
  });
});

describe("todayLocalIsoDate", () => {
  it("uses local calendar fields with zero padding", () => {
    expect(todayLocalIsoDate(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});

describe("formatDottedDate", () => {
  it("formats a date or timestamp prefix", () => {
    expect(formatDottedDate("2026-10-15")).toBe("2026.10.15");
    expect(formatDottedDate("2026-10-15T08:00:00+00:00")).toBe("2026.10.15");
  });
});
