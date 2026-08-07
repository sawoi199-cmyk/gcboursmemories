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
    <nav aria-label="开始探索" className="grid gap-3 sm:grid-cols-3">
      {entries.map((entry) => {
        const Icon = entry.icon;
        return (
          <Link
            key={entry.href}
            href={entry.href}
            className="group flex flex-col gap-3 rounded-2xl border border-paper/15 bg-night/35 px-4 py-4 text-paper backdrop-blur-sm transition-[border-color,background-color,transform] duration-300 hover:-translate-y-0.5 hover:border-gold/40 hover:bg-night/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-gold/15 text-gold">
              <Icon className="size-5" aria-hidden />
            </span>
            <span className="space-y-1">
              <span className="block font-serif text-xl leading-tight">{entry.title}</span>
              <span className="block text-xs leading-5 text-paper/60">{entry.description}</span>
            </span>
            <span className="mt-auto text-[11px] tracking-[0.22em] text-gold/80 uppercase transition-colors group-hover:text-gold">
              进入 →
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
