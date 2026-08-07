"use client";

import { useEffect, useState } from "react";
import {
  getDayPeriod,
  PERIOD_BACKGROUNDS,
  type DayPeriod,
} from "@/lib/atmosphere/day-period";
import { cn } from "@/lib/utils";

type AtmosphereBackgroundProps = {
  className?: string;
  /** Extra darkening for text-heavy screens (e.g. unlock). */
  intensity?: "default" | "strong";
};

export function AtmosphereBackground({
  className,
  intensity = "default",
}: AtmosphereBackgroundProps) {
  const [period, setPeriod] = useState<DayPeriod | null>(null);

  useEffect(() => {
    function sync() {
      setPeriod(getDayPeriod(new Date()));
    }
    sync();
    const timer = window.setInterval(sync, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const backgrounds = period ? PERIOD_BACKGROUNDS[period] : null;

  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {backgrounds ? (
        <picture>
          <source media="(max-width: 767px)" srcSet={backgrounds.mobile} />
          {/* eslint-disable-next-line @next/next/no-img-element -- atmospheric CSS background substitute */}
          <img
            src={backgrounds.desktop}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
          />
        </picture>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(165deg, #111216 0%, #1b1d22 35%, #3a2e2a 70%, #f6f1ea 100%)",
          }}
        />
      )}

      <div
        className={cn(
          "absolute inset-0",
          intensity === "strong"
            ? "bg-night/55"
            : "bg-gradient-to-t from-night/75 via-night/35 to-night/25",
        )}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(198,161,91,0.14),transparent_45%)]" />
    </div>
  );
}
