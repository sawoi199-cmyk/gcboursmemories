"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { AtmospherePageWash } from "@/components/experience/atmosphere-page-wash";
import { StudioNav } from "@/components/studio/studio-nav";
import { PERIOD_PAGE_THEME } from "@/lib/atmosphere/day-period";
import { useDayPeriod } from "@/lib/atmosphere/use-day-period";

export function StudioShell({
  children,
  supabaseReady,
}: {
  children: ReactNode;
  supabaseReady: boolean;
}) {
  const period = useDayPeriod();
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
      data-shell="studio"
      className="relative flex min-h-full flex-1 flex-col transition-colors duration-700"
      style={pageVars}
    >
      <AtmospherePageWash theme={theme} density="work" />

      <div className="relative z-10 flex min-h-full flex-1 flex-col">
        <StudioNav />
        {!supabaseReady ? (
          <div className="border-b border-[color:var(--atmosphere-line,#e8ded4)] bg-paper/80 px-4 py-2 text-center text-xs text-[color:var(--atmosphere-muted,#7a706a)]">
            Supabase 未配置：Studio UI 可预览，但登录保护与数据库尚未生效。见{" "}
            <Link href="/studio/settings" className="underline underline-offset-2">
              设置
            </Link>
            。
          </div>
        ) : null}
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
