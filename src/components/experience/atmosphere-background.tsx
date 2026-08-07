"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  PERIOD_BACKGROUNDS,
  PERIOD_HERO_FALLBACK,
  getDayPeriod,
  type DayPeriod,
} from "@/lib/atmosphere/day-period";
import { useDayPeriod } from "@/lib/atmosphere/use-day-period";
import { cn } from "@/lib/utils";

const MOBILE_QUERY = "(max-width: 767px)";

type AtmosphereBackgroundProps = {
  className?: string;
  /** Extra darkening for text-heavy screens (e.g. unlock). */
  intensity?: "default" | "strong";
};

function useIsMobileAtmosphere() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return isMobile;
}

function atmosphereSrc(period: DayPeriod, isMobile: boolean) {
  const pair = PERIOD_BACKGROUNDS[period];
  return isMobile ? pair.mobile : pair.desktop;
}

function preloadImage(src: string) {
  return new Promise<void>((resolve) => {
    const img = new window.Image();
    img.decoding = "async";
    const finish = () => resolve();
    img.onload = () => {
      if (typeof img.decode === "function") {
        void img.decode().then(finish).catch(finish);
      } else {
        finish();
      }
    };
    img.onerror = finish;
    img.src = src;
    if (img.complete) finish();
  });
}

export function AtmosphereBackground({
  className,
  intensity = "default",
}: AtmosphereBackgroundProps) {
  const period = useDayPeriod();
  const isMobile = useIsMobileAtmosphere();
  const reduceMotion = useReducedMotion();
  const targetSrc = period ? atmosphereSrc(period, isMobile) : null;

  const [readySrc, setReadySrc] = useState<string | null>(null);
  const [readyPeriod, setReadyPeriod] = useState<DayPeriod | null>(null);

  // Preload before swapping so fade starts with a decoded frame.
  useEffect(() => {
    if (!targetSrc || !period) return;
    let cancelled = false;

    void preloadImage(targetSrc).then(() => {
      if (cancelled) return;
      setReadySrc(targetSrc);
      setReadyPeriod(period);
    });

    return () => {
      cancelled = true;
    };
  }, [targetSrc, period]);

  // Near period edges, warm the next hour's asset.
  useEffect(() => {
    if (!period) return;
    const hour = new Date().getHours();
    if (![4, 10, 15, 18].includes(hour)) return;
    const neighbor = getDayPeriod(new Date(Date.now() + 60 * 60 * 1000));
    if (neighbor === period) return;
    void preloadImage(atmosphereSrc(neighbor, isMobile));
  }, [period, isMobile]);

  const fallback = PERIOD_HERO_FALLBACK[readyPeriod ?? period ?? "night"];
  const duration = reduceMotion ? 0 : 0.7;

  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="absolute inset-0" style={{ backgroundImage: fallback }} />

      <AnimatePresence initial={false}>
        {readySrc ? (
          <motion.img
            key={readySrc}
            src={readySrc}
            alt=""
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 h-full w-full object-cover"
            draggable={false}
          />
        ) : null}
      </AnimatePresence>

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
