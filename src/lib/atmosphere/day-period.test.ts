import { describe, expect, it } from "vitest";
import {
  getBackgroundsForPeriod,
  getDayPeriod,
  PERIOD_HERO_FALLBACK,
  PERIOD_PAGE_THEME,
} from "@/lib/atmosphere/day-period";

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

describe("PERIOD_PAGE_THEME", () => {
  it("defines readable paper tints for every period", () => {
    for (const period of ["morning", "noon", "dusk", "night"] as const) {
      expect(PERIOD_PAGE_THEME[period].page).toMatch(/^#/);
      expect(PERIOD_PAGE_THEME[period].nav).toContain("rgba");
    }
  });
});

describe("PERIOD_HERO_FALLBACK", () => {
  it("provides a gradient fallback for every period", () => {
    for (const period of ["morning", "noon", "dusk", "night"] as const) {
      expect(PERIOD_HERO_FALLBACK[period]).toContain("linear-gradient");
    }
  });
});
