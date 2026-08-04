"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";
import { PhotoPlaceholder } from "@/components/experience/photo-placeholder";
import { TimelineCalendar } from "@/components/experience/timeline-calendar";
import { FadeIn } from "@/components/motion/fade-in";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/status-blocks";
import type { ChapterId } from "@/config/chapters";
import type {
  CalendarDayCount,
  PublishedMemory,
  TimelineCursor,
  TimelinePageResult,
} from "@/features/memories/published";
import { cn } from "@/lib/utils";

const filters = [
  { id: "all", label: "全部" },
  { id: "旅行", label: "旅行", chapter: "journeys" as ChapterId },
  { id: "日常", label: "日常", chapter: "ordinary_days" as ChapterId },
  { id: "庆祝", label: "庆祝", chapter: "celebrations" as ChapterId },
  { id: "食物", label: "食物", chapter: "food_and_places" as ChapterId },
  { id: "地点", label: "地点", hasPlace: true },
] as const;

type FilterId = (typeof filters)[number]["id"];

function formatDisplayDate(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00`);
  return {
    year: String(date.getFullYear()),
    short: `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`,
  };
}

function buildQuery(params: {
  filterId: FilterId;
  eventDate: string | null;
  cursor: TimelineCursor | null;
}) {
  const search = new URLSearchParams();
  const filter = filters.find((item) => item.id === params.filterId);
  if (filter && "chapter" in filter && filter.chapter) {
    search.set("chapter", filter.chapter);
  }
  if (filter && "hasPlace" in filter && filter.hasPlace) {
    search.set("hasPlace", "1");
  }
  if (params.eventDate) search.set("eventDate", params.eventDate);
  if (params.cursor) {
    search.set("cursorDate", params.cursor.eventDate);
    search.set("cursorId", params.cursor.id);
  }
  return search.toString();
}

type TimelineViewProps = {
  initial: TimelinePageResult;
  calendarDays: CalendarDayCount[];
  archiveEmpty: boolean;
};

export function TimelineView({
  initial,
  calendarDays,
  archiveEmpty,
}: TimelineViewProps) {
  const [filter, setFilter] = useState<FilterId>("all");
  const [eventDate, setEventDate] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [memories, setMemories] = useState(initial.memories);
  const [nextCursor, setNextCursor] = useState(initial.nextCursor);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [loadingMore, setLoadingMore] = useState(false);

  const reload = useCallback(
    (nextFilter: FilterId, nextEventDate: string | null) => {
      startTransition(() => {
        void (async () => {
          setError(null);
          try {
            const query = buildQuery({
              filterId: nextFilter,
              eventDate: nextEventDate,
              cursor: null,
            });
            const response = await fetch(`/api/timeline?${query}`);
            const json = (await response.json()) as {
              ok: boolean;
              message?: string;
              memories?: PublishedMemory[];
              nextCursor?: TimelineCursor | null;
            };
            if (!response.ok || !json.ok || !json.memories) {
              throw new Error(json.message ?? "加载失败");
            }
            setMemories(json.memories);
            setNextCursor(json.nextCursor ?? null);
          } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : "加载失败");
          }
        })();
      });
    },
    [],
  );

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const query = buildQuery({
        filterId: filter,
        eventDate,
        cursor: nextCursor,
      });
      const response = await fetch(`/api/timeline?${query}`);
      const json = (await response.json()) as {
        ok: boolean;
        message?: string;
        memories?: PublishedMemory[];
        nextCursor?: TimelineCursor | null;
      };
      if (!response.ok || !json.ok || !json.memories) {
        throw new Error(json.message ?? "加载失败");
      }
      setMemories((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        const appended = json.memories!.filter((item) => !seen.has(item.id));
        return [...prev, ...appended];
      });
      setNextCursor(json.nextCursor ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载失败");
    } finally {
      setLoadingMore(false);
    }
  }

  const selectedLabel = useMemo(() => {
    if (!eventDate) return null;
    const [y, m, d] = eventDate.split("-");
    return `${y}年${Number(m)}月${Number(d)}日`;
  }, [eventDate]);

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 md:py-16">
      <FadeIn>
        <p className="text-xs tracking-[0.25em] text-gold uppercase">Timeline</p>
        <h1 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">时间线</h1>
        <p className="mt-3 text-sm text-muted-ours">按日期慢慢往回翻，或用日历跳到某一天。</p>
      </FadeIn>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="分类筛选">
          {filters.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={filter === item.id}
              disabled={pending}
              onClick={() => {
                setFilter(item.id);
                reload(item.id, eventDate);
              }}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors",
                filter === item.id
                  ? "border-ink bg-ink text-paper"
                  : "border-line bg-paper text-muted-ours hover:border-ink/30",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          aria-expanded={calendarOpen}
          onClick={() => setCalendarOpen((open) => !open)}
          className={cn(
            "ml-auto shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors",
            calendarOpen || eventDate
              ? "border-ink bg-ink text-paper"
              : "border-line bg-paper text-muted-ours hover:border-ink/30",
          )}
        >
          {eventDate ? selectedLabel : "日历"}
        </button>
      </div>

      {calendarOpen ? (
        <div className="mt-4">
          <TimelineCalendar
            days={calendarDays}
            selectedDate={eventDate}
            onSelectDate={(date) => {
              setEventDate(date);
              reload(filter, date);
              if (date) setCalendarOpen(false);
            }}
          />
        </div>
      ) : null}

      {eventDate && !calendarOpen ? (
        <p className="mt-3 text-xs text-muted-ours">
          正在看 {selectedLabel}
          <button
            type="button"
            className="ml-2 text-accent-ours underline-offset-4 hover:underline"
            onClick={() => {
              setEventDate(null);
              reload(filter, null);
            }}
          >
            清除
          </button>
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm text-accent-ours" role="alert">
          {error}
        </p>
      ) : null}

      {archiveEmpty ? (
        <EmptyState
          className="mt-12"
          title="时间线还是空的"
          description="在 Studio 发布第一篇回忆后，就会出现在这里。"
          actionHref="/studio"
          actionLabel="前往 Studio →"
        />
      ) : memories.length === 0 ? (
        <EmptyState
          className="mt-12"
          title={eventDate ? "这一天还没有回忆" : "这个分类下暂时没有回忆"}
          description={
            eventDate
              ? "换一天看看，或清除日期筛选。"
              : "换一个筛选，或稍后再来。"
          }
        />
      ) : (
        <>
          <ul className={cn("mt-10 space-y-10", pending && "opacity-60")}>
            {memories.map((memory, index) => {
              const date = formatDisplayDate(memory.eventDate);
              const cover = memory.photos[0];

              return (
                <FadeIn key={memory.id} delay={Math.min(0.04 * index, 0.24)}>
                  <li className="grid gap-5 border-t border-line pt-8 md:grid-cols-[88px_1fr]">
                    <div className="md:sticky md:top-20">
                      <p className="font-serif text-3xl text-ink">{date.short}</p>
                      <p className="text-xs text-muted-ours">{date.year}</p>
                    </div>
                    <Link
                      href={`/memory/${memory.slug}`}
                      className="group grid gap-4 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[1.2fr_1fr] sm:items-center"
                    >
                      {cover ? (
                        <PhotoPlaceholder
                          photo={cover}
                          imageUrl={cover.thumbnailUrl}
                          enableLightbox={false}
                          className="rounded-xl transition-transform duration-200 group-hover:scale-[1.01]"
                        />
                      ) : null}
                      <div>
                        <p className="text-xs text-muted-ours">
                          {memory.placeName ?? "地点未记录"}
                        </p>
                        <h2 className="mt-1 font-serif text-2xl text-ink group-hover:text-accent-ours md:text-3xl">
                          {memory.title}
                        </h2>
                        <p className="mt-2 text-sm leading-7 text-muted-ours">
                          {memory.oneLine}
                        </p>
                      </div>
                    </Link>
                  </li>
                </FadeIn>
              );
            })}
          </ul>

          {nextCursor ? (
            <div className="mt-10 flex justify-center">
              <button
                type="button"
                disabled={loadingMore || pending}
                onClick={() => void loadMore()}
                className={cn(
                  buttonVariants({ variant: "outline", size: "lg" }),
                  "border-line bg-paper text-ink",
                )}
              >
                {loadingMore ? "加载中…" : "加载更多"}
              </button>
            </div>
          ) : memories.length > 0 ? (
            <p className="mt-10 text-center text-xs text-muted-ours">已经到尽头了</p>
          ) : null}
        </>
      )}
    </section>
  );
}
