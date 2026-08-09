import { describe, expect, it } from "vitest";
import { formatArchiveDate } from "@/lib/utils/date";

describe("formatArchiveDate", () => {
  it("formats a calendar date without shifting the day", () => {
    expect(formatArchiveDate("2026-08-09")).toEqual({
      year: "2026",
      short: "08.09",
    });
  });
});
