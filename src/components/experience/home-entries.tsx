import Link from "next/link";
import { BookOpen, CalendarDays, Mail } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const entries: {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    href: "/story",
    title: "故事",
    description: "按章节走进我们的回忆",
    icon: BookOpen,
  },
  {
    href: "/timeline",
    title: "时间线",
    description: "按日期翻看每一个瞬间",
    icon: CalendarDays,
  },
  {
    href: "/letter",
    title: "信件",
    description: "留给彼此的话",
    icon: Mail,
  },
];

export function HomeEntries() {
  return (
    <nav aria-label="开始探索" className="grid grid-cols-3 gap-2 sm:gap-3">
      {entries.map((entry) => {
        const Icon = entry.icon;
        return (
          <Link
            key={entry.href}
            href={entry.href}
            className="group flex flex-col items-center gap-2 rounded-2xl border border-paper/15 bg-night/35 px-2 py-3 text-center text-paper backdrop-blur-sm transition-[border-color,background-color,transform] duration-300 hover:-translate-y-0.5 hover:border-gold/40 hover:bg-night/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 sm:items-start sm:gap-3 sm:px-4 sm:py-4 sm:text-left"
          >
            <span className="grid size-8 place-items-center rounded-xl bg-gold/15 text-gold sm:size-10">
              <Icon className="size-4 sm:size-5" aria-hidden />
            </span>
            <span className="space-y-1">
              <span className="block font-serif text-sm leading-tight sm:text-xl">
                {entry.title}
              </span>
              <span className="hidden text-xs leading-5 text-paper/60 sm:block">
                {entry.description}
              </span>
            </span>
            <span className="mt-auto hidden text-[11px] tracking-[0.22em] text-gold/80 uppercase transition-colors group-hover:text-gold sm:block">
              进入 →
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
