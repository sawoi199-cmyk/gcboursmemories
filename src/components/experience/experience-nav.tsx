"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const experienceLinks = [
  { href: "/", label: "开场" },
  { href: "/story", label: "故事" },
  { href: "/timeline", label: "时间线" },
  { href: "/letter", label: "信件" },
] as const;

type ExperienceNavProps = {
  /** Home / unlock sit on photo stages — keep the bar quiet and translucent. */
  overHero?: boolean;
};

export function ExperienceNav({ overHero = false }: ExperienceNavProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b backdrop-blur-md transition-[background-color,border-color,color] duration-500",
        overHero
          ? "border-paper/10 bg-night/35 text-paper/70"
          : "border-[color:var(--atmosphere-line,#e8ded4)]/80 bg-[color:var(--atmosphere-nav,rgba(246,241,234,0.9))] text-[color:var(--atmosphere-muted,#7a706a)]",
      )}
    >
      <nav
        aria-label="体验导航"
        className="mx-auto flex max-w-5xl items-center gap-1 overflow-x-auto px-3 py-3 text-xs tracking-wide sm:px-4 md:gap-3 md:text-sm"
      >
        <Link
          href="/"
          className={cn(
            "mr-1 shrink-0 font-serif text-base tracking-[0.15em] sm:mr-2",
            overHero ? "text-paper" : "text-ink",
          )}
        >
          OURS
        </Link>
        {experienceLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "shrink-0 rounded-md px-2 py-1.5 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
              overHero
                ? "hover:bg-paper/10 hover:text-paper"
                : "hover:bg-paper/80 hover:text-ink",
            )}
          >
            {link.label}
          </Link>
        ))}
        <Link
          href="/studio"
          className={cn(
            "ml-auto shrink-0 rounded-md px-2 py-1.5 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50",
            overHero
              ? "text-paper/55 hover:bg-paper/10 hover:text-paper"
              : "text-ink/70 hover:bg-paper/80 hover:text-ink",
          )}
        >
          Studio
        </Link>
      </nav>
    </header>
  );
}
