"use client";

import { useEffect, useRef } from "react";

type InfiniteScrollSentinelProps = {
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void | Promise<void>;
  /** Prefetch before the sentinel enters the viewport. */
  rootMargin?: string;
  loadingLabel?: string;
  className?: string;
};

/**
 * Fires onLoadMore when scrolled near the bottom.
 * Keeps a light status line; parents can still show errors / end copy.
 */
export function InfiniteScrollSentinel({
  hasMore,
  loading,
  onLoadMore,
  rootMargin = "480px 0px",
  loadingLabel = "加载中…",
  className,
}: InfiniteScrollSentinelProps) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  const lockRef = useRef(false);

  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    if (!loading) {
      lockRef.current = false;
    }
  }, [loading]);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node || !hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        if (lockRef.current) return;
        lockRef.current = true;
        void onLoadMoreRef.current();
      },
      { root: null, rootMargin, threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, rootMargin]);

  if (!hasMore) return null;

  return (
    <div
      ref={nodeRef}
      className={className ?? "mt-10 flex min-h-10 items-center justify-center py-4"}
      aria-hidden={!loading}
    >
      <p className="text-xs text-muted-ours" aria-live="polite">
        {loading ? loadingLabel : "\u00a0"}
      </p>
    </div>
  );
}
