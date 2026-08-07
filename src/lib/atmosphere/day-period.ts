export type DayPeriod = "morning" | "noon" | "dusk" | "night";

export type DeviceBackgrounds = {
  desktop: string;
  mobile: string;
};

/** Local-time buckets for atmosphere backgrounds. */
export function getDayPeriod(date: Date = new Date()): DayPeriod {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 16) return "noon";
  if (hour >= 16 && hour < 19) return "dusk";
  return "night";
}

export const PERIOD_BACKGROUNDS: Record<DayPeriod, DeviceBackgrounds> = {
  morning: {
    desktop: "/backgrounds/morning-desktop.webp",
    mobile: "/backgrounds/morning-mobile.webp",
  },
  noon: {
    desktop: "/backgrounds/noon-desktop.webp",
    mobile: "/backgrounds/noon-mobile.webp",
  },
  dusk: {
    desktop: "/backgrounds/dusk-desktop.webp",
    mobile: "/backgrounds/dusk-mobile.webp",
  },
  night: {
    desktop: "/backgrounds/night-desktop.webp",
    mobile: "/backgrounds/night-mobile.webp",
  },
};

export function getBackgroundsForPeriod(
  period: DayPeriod = getDayPeriod(),
): DeviceBackgrounds {
  return PERIOD_BACKGROUNDS[period];
}

/** Period-tinted gradients shown under photos while they load / crossfade. */
export const PERIOD_HERO_FALLBACK: Record<DayPeriod, string> = {
  morning:
    "linear-gradient(165deg, #2a221c 0%, #5a4636 32%, #c4a07a 68%, #f3e6d4 100%)",
  noon:
    "linear-gradient(165deg, #1c2430 0%, #3d4a5c 34%, #8fa6b8 70%, #e8eef2 100%)",
  dusk:
    "linear-gradient(165deg, #1a1418 0%, #4a3038 30%, #b46a6a 65%, #f0e0d4 100%)",
  night:
    "linear-gradient(165deg, #111216 0%, #1b1d22 35%, #3a2e2a 70%, #f6f1ea 100%)",
};

/** Soft paper tints for reading pages — echoes home photos without covering content. */
export type PeriodPageTheme = {
  page: string;
  nav: string;
  inkSoft: string;
  line: string;
  washA: string;
  washB: string;
  rim: string;
};

export const PERIOD_PAGE_THEME: Record<DayPeriod, PeriodPageTheme> = {
  morning: {
    page: "#f8f1e6",
    nav: "rgba(248, 241, 230, 0.9)",
    inkSoft: "#6f6458",
    line: "#eadccb",
    washA: "rgba(255, 210, 160, 0.28)",
    washB: "rgba(198, 161, 91, 0.12)",
    rim: "rgba(255, 196, 140, 0.35)",
  },
  noon: {
    page: "#f5f2eb",
    nav: "rgba(245, 242, 235, 0.9)",
    inkSoft: "#736a62",
    line: "#e5ddd2",
    washA: "rgba(210, 224, 236, 0.22)",
    washB: "rgba(198, 161, 91, 0.1)",
    rim: "rgba(186, 206, 222, 0.28)",
  },
  dusk: {
    page: "#f5ebe4",
    nav: "rgba(245, 235, 228, 0.9)",
    inkSoft: "#7a655c",
    line: "#e8d5cb",
    washA: "rgba(210, 140, 120, 0.16)",
    washB: "rgba(198, 161, 91, 0.14)",
    rim: "rgba(196, 130, 110, 0.28)",
  },
  night: {
    page: "#ece9e6",
    nav: "rgba(236, 233, 230, 0.92)",
    inkSoft: "#6d6864",
    line: "#dbd4ce",
    washA: "rgba(90, 100, 130, 0.1)",
    washB: "rgba(198, 161, 91, 0.08)",
    rim: "rgba(120, 130, 160, 0.18)",
  },
};
