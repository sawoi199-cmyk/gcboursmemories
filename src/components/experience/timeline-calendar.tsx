"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { CalendarDayCount } from "@/features/memories/published";

const WEEKDAYS = ["一", "二", "三", "四", "五", "六", "日"] as const;

type TimelineCalendarProps = {
  days: CalendarDayCount[];
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
};

function monthKey(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

function parseMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  return { year: year ?? 2026, monthIndex: (month ?? 1) - 1 };
}

export function TimelineCalendar({
  days,
  selectedDate,
  onSelectDate,
}: TimelineCalendarProps) {
  const countByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const day of days) map.set(day.date, day.count);
    return map;
  }, [days]);

  const initialMonth = useMemo(() => {
    if (selectedDate) return selectedDate.slice(0, 7);
    if (days[0]?.date) return days[0].date.slice(0, 7);
    const now = new Date();
    return monthKey(now.getFullYear(), now.getMonth());
  }, [days, selectedDate]);

  const [visibleMonth, setVisibleMonth] = useState(initialMonth);
  const { year, monthIndex } = parseMonth(visibleMonth);

  const cells = useMemo(() => {
    const first = new Date(year, monthIndex, 1);
    // Monday-first: JS Sunday=0 → shift so Monday is 0.
    const startPad = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const result: Array<{ date: string | null; day: number | null }> = [];

    for (let i = 0; i < startPad; i += 1) {
      result.push({ date: null, day: null });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      result.push({ date, day });
    }
    while (result.length % 7 !== 0) {
      result.push({ date: null, day: null });
    }
    return result;
  }, [year, monthIndex]);

  function shiftMonth(delta: number) {
    const next = new Date(year, monthIndex + delta, 1);
    setVisibleMonth(monthKey(next.getFullYear(), next.getMonth()));
  }

  const monthLabel = `${year}年${monthIndex + 1}月`;

  return (
    <div className="rounded-2xl border border-line bg-paper px-3 py-4 sm:px-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          className="rounded-md px-2 py-1 text-sm text-muted-ours hover:bg-background hover:text-ink"
          aria-label="上个月"
        >
          ‹
        </button>
        <p className="font-serif text-lg text-ink">{monthLabel}</p>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          className="rounded-md px-2 py-1 text-sm text-muted-ours hover:bg-background hover:text-ink"
          aria-label="下个月"
        >
          ›
        </button>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] tracking-wide text-muted-ours">
        {WEEKDAYS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((cell, index) => {
          if (!cell.date || cell.day == null) {
            return <div key={`pad-${index}`} className="aspect-square" />;
          }

          const count = countByDate.get(cell.date) ?? 0;
          const hasMemories = count > 0;
          const selected = selectedDate === cell.date;

          return (
            <button
              key={cell.date}
              type="button"
              disabled={!hasMemories}
              onClick={() => onSelectDate(selected ? null : cell.date)}
              aria-pressed={selected}
              aria-label={
                hasMemories
                  ? `${cell.date}，${count} 篇回忆`
                  : `${cell.date}，无回忆`
              }
              className={cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-colors",
                hasMemories
                  ? "text-ink hover:bg-background"
                  : "cursor-default text-muted-ours/35",
                selected && "bg-ink text-paper hover:bg-ink",
              )}
            >
              <span className="font-serif text-base leading-none">{cell.day}</span>
              {hasMemories ? (
                <span
                  className={cn(
                    "mt-1 size-1 rounded-full",
                    selected ? "bg-gold" : "bg-gold/80",
                  )}
                  aria-hidden
                />
              ) : (
                <span className="mt-1 size-1" aria-hidden />
              )}
            </button>
          );
        })}
      </div>

      {selectedDate ? (
        <button
          type="button"
          onClick={() => onSelectDate(null)}
          className="mt-3 text-xs text-accent-ours underline-offset-4 hover:underline"
        >
          清除日期 · 显示全部
        </button>
      ) : (
        <p className="mt-3 text-xs text-muted-ours">有圆点的日子可以点选，像相册按日查看。</p>
      )}
    </div>
  );
}
