"use client";

import { useEffect, useState } from "react";
import { getDayPeriod, type DayPeriod } from "@/lib/atmosphere/day-period";

/** Client-local day period; null until mounted to avoid SSR timezone mismatch. */
export function useDayPeriod(pollMs = 60_000): DayPeriod | null {
  const [period, setPeriod] = useState<DayPeriod | null>(null);

  useEffect(() => {
    function sync() {
      setPeriod(getDayPeriod(new Date()));
    }
    sync();
    const timer = window.setInterval(sync, pollMs);
    return () => window.clearInterval(timer);
  }, [pollMs]);

  return period;
}
