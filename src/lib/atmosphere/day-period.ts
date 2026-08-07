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
