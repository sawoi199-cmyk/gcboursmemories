"use client";

import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { ExperienceNav } from "@/components/experience/experience-nav";
import { ExperiencePageWash } from "@/components/experience/experience-page-wash";
import { PageTransition } from "@/components/motion/page-transition";
import { PERIOD_PAGE_THEME } from "@/lib/atmosphere/day-period";
import { useDayPeriod } from "@/lib/atmosphere/use-day-period";
import { cn } from "@/lib/utils";

const HERO_ROUTES = new Set(["/", "/unlock"]);

export function ExperienceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const period = useDayPeriod();
  const isHero = HERO_ROUTES.has(pathname);
  const theme = PERIOD_PAGE_THEME[period ?? "morning"];

  const pageVars = {
    backgroundColor: theme.page,
    ["--atmosphere-page"]: theme.page,
    ["--atmosphere-nav"]: theme.nav,
    ["--atmosphere-line"]: theme.line,
    ["--atmosphere-muted"]: theme.inkSoft,
  } as CSSProperties;

  return (
    <div
      data-period={period ?? undefined}
      data-shell={isHero ? "hero" : "page"}
      className={cn(
        "relative flex min-h-full flex-1 flex-col transition-colors duration-700",
        isHero ? "bg-night" : undefined,
      )}
      style={isHero ? undefined : pageVars}
    >
      {!isHero ? <ExperiencePageWash theme={theme} /> : null}

      <ExperienceNav overHero={isHero} />

      <main className="relative z-10 flex flex-1 flex-col">
        <PageTransition className="flex flex-1 flex-col">{children}</PageTransition>
      </main>
    </div>
  );
}
