"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { InfiniteScrollSentinel } from "@/components/experience/infinite-scroll-sentinel";
import { MomentComposer } from "@/components/experience/moment-composer";
import { FadeIn } from "@/components/motion/fade-in";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/status-blocks";
import { fetchMomentsPage } from "@/features/moments/moment-api-client";
import type { MomentCursor } from "@/features/moments/moment-schema";
import type { MomentTile } from "@/features/moments/moments";
import type { CoupleNames } from "@/features/relationship-profile/couple-names";
import { cn } from "@/lib/utils";

type MomentsGridProps = {
  initialMoments: MomentTile[];
  initialCursor: MomentCursor | null;
  names: CoupleNames;
  canEdit: boolean;
};

/** Same order as the feed query: taken_on desc, then posting order desc. */
function sortTiles(tiles: MomentTile[]) {
  return [...tiles].sort((a, b) => b.takenOn.localeCompare(a.takenOn) || b.seq - a.seq);
}

export function MomentsGrid({ initialMoments, initialCursor, names, canEdit }: MomentsGridProps) {
  const [moments, setMoments] = useState(initialMoments);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    setError(null);
    const result = await fetchMomentsPage(cursor);
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setMoments((current) => {
      const seen = new Set(current.map((tile) => tile.id));
      return [...current, ...result.data.moments.filter((tile) => !seen.has(tile.id))];
    });
    setCursor(result.data.nextCursor);
  }, [cursor, loading]);

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 md:py-16">
      <FadeIn className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.25em] text-gold uppercase">Moments</p>
          <h1 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">流光</h1>
          <p className="mt-3 max-w-md text-sm leading-7 text-muted-ours">一张照片，一句话。</p>
        </div>
        {canEdit ? (
          <button
            type="button"
            onClick={() => setComposing(true)}
            className={cn(buttonVariants(), "shrink-0 gap-1 rounded-full px-4")}
          >
            <Plus className="size-4" aria-hidden />
            发一条
          </button>
        ) : null}
      </FadeIn>

      {moments.length === 0 ? (
        <EmptyState
          className="mt-10"
          title="还没有流光"
          description="随手拍下的一刻，配一句话，就是一条流光。"
        />
      ) : (
        <ul className="mt-8 grid grid-cols-3 gap-1 sm:gap-2">
          {moments.map((moment) => (
            <li key={moment.id}>
              <Link
                href={`/moments/${moment.id}`}
                className="group relative block aspect-square overflow-hidden rounded-md bg-paper bg-[linear-gradient(135deg,#efe4d6,#f7efe6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 sm:rounded-lg"
              >
                {moment.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={moment.thumbnailUrl}
                    alt={moment.caption}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <span className="absolute inset-0 grid place-items-center p-2 text-center text-xs text-muted-ours">
                    {moment.caption}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <InfiniteScrollSentinel
        hasMore={cursor !== null}
        loading={loading}
        onLoadMore={loadMore}
        className="mt-6"
      />
      {error ? (
        <p className="mt-4 text-center text-sm text-accent-ours">
          {error}{" "}
          <button type="button" onClick={() => void loadMore()} className="underline underline-offset-4">
            重试
          </button>
        </p>
      ) : null}

      {composing ? (
        <MomentComposer
          names={names}
          onClose={() => setComposing(false)}
          onCreated={(moment) => {
            setComposing(false);
            setMoments((current) => sortTiles([moment, ...current]));
          }}
        />
      ) : null}
    </section>
  );
}
