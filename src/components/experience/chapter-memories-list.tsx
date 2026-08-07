"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { InfiniteScrollSentinel } from "@/components/experience/infinite-scroll-sentinel";
import { PhotoPlaceholder } from "@/components/experience/photo-placeholder";
import { FadeIn } from "@/components/motion/fade-in";
import type { ChapterId } from "@/config/chapters";
import type {
  PublishedMemory,
  TimelineCursor,
} from "@/features/memories/published";

type ChapterMemoriesListProps = {
  chapterId: ChapterId;
  initialMemories: PublishedMemory[];
  initialCursor: TimelineCursor | null;
};

function formatDisplayDate(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00`);
  return {
    year: String(date.getFullYear()),
    short: `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`,
  };
}

export function ChapterMemoriesList({
  chapterId,
  initialMemories,
  initialCursor,
}: ChapterMemoriesListProps) {
  const [memories, setMemories] = useState(initialMemories);
  const [nextCursor, setNextCursor] = useState(initialCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingMoreRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    setError(null);
    try {
      const search = new URLSearchParams({
        chapter: chapterId,
        cursorDate: nextCursor.eventDate,
        cursorId: nextCursor.id,
      });
      const response = await fetch(`/api/chapter?${search.toString()}`);
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
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [chapterId, nextCursor]);

  return (
    <>
      {error ? (
        <p className="mt-4 text-sm text-accent-ours" role="alert">
          {error}{" "}
          {nextCursor ? (
            <button
              type="button"
              className="underline underline-offset-4"
              onClick={() => void loadMore()}
            >
              重试
            </button>
          ) : null}
        </p>
      ) : null}

      <ul className="mt-10 space-y-10">
        {memories.map((memory, index) => {
          const date = formatDisplayDate(memory.eventDate);
          const cover = memory.photos[0];

          return (
            <FadeIn key={memory.id} delay={Math.min(0.04 * index, 0.24)}>
              <li className="grid gap-5 border-t border-line pt-8 sm:grid-cols-[88px_1fr]">
                <div>
                  <p className="font-serif text-3xl text-ink">{date.short}</p>
                  <p className="text-xs text-muted-ours">{date.year}</p>
                </div>
                <Link
                  href={`/memory/${memory.slug}`}
                  className="group grid gap-4 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[1.1fr_1fr] sm:items-center"
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

      <InfiniteScrollSentinel
        hasMore={Boolean(nextCursor)}
        loading={loadingMore}
        onLoadMore={loadMore}
      />

      {!nextCursor && memories.length > 0 ? (
        <p className="mt-2 text-center text-xs text-muted-ours">这一章已经读完了</p>
      ) : null}
    </>
  );
}
