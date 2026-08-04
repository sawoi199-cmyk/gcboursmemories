import { cn } from "@/lib/utils";

type ExperiencePageLoadingProps = {
  maxWidthClassName?: string;
  rows?: number;
};

/** Instant route fallback while RSC data loads. */
export function ExperiencePageLoading({
  maxWidthClassName = "max-w-4xl",
  rows = 3,
}: ExperiencePageLoadingProps) {
  return (
    <section
      className={cn("mx-auto w-full px-4 py-10 sm:px-6 md:py-16", maxWidthClassName)}
      aria-busy
      aria-label="页面加载中"
    >
      <div className="h-3 w-24 animate-pulse rounded bg-line/80" />
      <div className="mt-3 h-9 w-48 animate-pulse rounded bg-line/80" />
      <div className="mt-3 h-4 w-64 max-w-full animate-pulse rounded bg-line/60" />

      <ul className="mt-10 space-y-10">
        {Array.from({ length: rows }, (_, index) => (
          <li
            key={index}
            className="grid gap-5 border-t border-line pt-8 md:grid-cols-[88px_1fr]"
          >
            <div className="space-y-2">
              <div className="h-8 w-16 animate-pulse rounded bg-line/70" />
              <div className="h-3 w-10 animate-pulse rounded bg-line/50" />
            </div>
            <div className="grid gap-4 sm:grid-cols-[1.2fr_1fr] sm:items-center">
              <div className="aspect-[4/3] animate-pulse rounded-xl bg-line/60" />
              <div className="space-y-3">
                <div className="h-3 w-24 animate-pulse rounded bg-line/50" />
                <div className="h-7 w-40 animate-pulse rounded bg-line/70" />
                <div className="h-4 w-full animate-pulse rounded bg-line/50" />
                <div className="h-4 w-[75%] animate-pulse rounded bg-line/40" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
