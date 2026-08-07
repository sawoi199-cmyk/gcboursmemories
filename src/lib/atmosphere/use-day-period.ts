"use client";

import { useEffect, useState } from "react";
import { getDayPeriod, type DayPeriod } from "@/lib/atmosphere/day-period";

/** Client-local day period; null until mounted to avoid SSR timezone mismatch. */
export function useDayPeriod(pollMs = 60_000): DayPeriod | null {
  const [period, setPeriod] = useState<DayPeriod | null>(null);

  useEffect(() => {
    function sync() {
      const next = getDayPeriod(new Date());
      setPeriod((current) => (current === next ? current : next));
    }

    sync();
    const timer = window.setInterval(sync, pollMs);
    const onVisibility = () => {
      if (document.visibilityState === "visible") sync();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pollMs]);

  return period;
}
