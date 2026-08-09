import Link from "next/link";
import { notFound } from "next/navigation";
import { FadeIn } from "@/components/motion/fade-in";
import { getPublishedMemoryBySlug } from "@/features/memories/published";
import { MemoryLayoutRenderer } from "@/features/templates/registry";
import { formatArchiveDate } from "@/lib/utils/date";

type MemoryPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function MemoryPage({ params }: MemoryPageProps) {
  const { slug } = await params;
  const payload = await getPublishedMemoryBySlug(slug);

  if (!payload) {
    notFound();
  }

  const { memory, prev, next } = payload;
  const date = formatArchiveDate(memory.eventDate);

  return (
    <article className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 md:py-16">
      <FadeIn>
        <p className="text-xs tracking-[0.2em] text-muted-ours">
          {date.year}.{date.short}
          {memory.placeName ? ` · ${memory.placeName}` : ""}
        </p>
      </FadeIn>

      <FadeIn delay={0.08} className="mt-8">
        <MemoryLayoutRenderer memory={memory} photos={memory.photos} mode="published" />
      </FadeIn>

      {memory.tags && memory.tags.length > 0 ? (
        <ul className="mt-10 flex flex-wrap gap-2">
          {memory.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full border border-line px-3 py-1 text-xs text-muted-ours"
            >
              {tag}
            </li>
          ))}
        </ul>
      ) : null}

      <nav
        className="mt-14 flex flex-col gap-4 border-t border-line pt-8 sm:flex-row sm:justify-between"
        aria-label="相邻回忆"
      >
        {prev ? (
          <Link href={`/memory/${prev.slug}`} className="text-sm text-muted-ours hover:text-ink">
            ← {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/memory/${next.slug}`}
            className="text-sm text-muted-ours hover:text-ink sm:text-right"
          >
            {next.title} →
          </Link>
        ) : null}
      </nav>
    </article>
  );
}
