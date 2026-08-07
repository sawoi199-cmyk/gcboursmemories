import { describe, expect, it } from "vitest";
import { getBackgroundsForPeriod, getDayPeriod } from "@/lib/atmosphere/day-period";

describe("getDayPeriod", () => {
  it("maps local hours to atmosphere periods", () => {
    expect(getDayPeriod(new Date(2026, 7, 7, 5, 0))).toBe("morning");
    expect(getDayPeriod(new Date(2026, 7, 7, 10, 59))).toBe("morning");
    expect(getDayPeriod(new Date(2026, 7, 7, 11, 0))).toBe("noon");
    expect(getDayPeriod(new Date(2026, 7, 7, 15, 59))).toBe("noon");
    expect(getDayPeriod(new Date(2026, 7, 7, 16, 0))).toBe("dusk");
    expect(getDayPeriod(new Date(2026, 7, 7, 18, 59))).toBe("dusk");
    expect(getDayPeriod(new Date(2026, 7, 7, 19, 0))).toBe("night");
    expect(getDayPeriod(new Date(2026, 7, 7, 4, 59))).toBe("night");
  });
});

describe("getBackgroundsForPeriod", () => {
  it("returns desktop and mobile assets for each period", () => {
    expect(getBackgroundsForPeriod("dusk")).toEqual({
      desktop: "/backgrounds/dusk-desktop.webp",
      mobile: "/backgrounds/dusk-mobile.webp",
    });
  });
});
