import Link from "next/link";
import { notFound } from "next/navigation";
import { PhotoPlaceholder } from "@/components/experience/photo-placeholder";
import { FadeIn } from "@/components/motion/fade-in";
import { EmptyState } from "@/components/ui/status-blocks";
import {
  DEFAULT_CHAPTER_LABELS,
  isChapterId,
  type ChapterId,
} from "@/config/chapters";
import {
  getPublishedMemories,
  getStoryChapters,
} from "@/features/memories/published";

export const dynamic = "force-dynamic";

type ChapterPageProps = {
  params: Promise<{ chapterId: string }>;
};

/** Match story list grouping: unknown/missing chapter → ordinary_days. */
function storyChapterKey(chapter: string | undefined): ChapterId {
  return chapter && isChapterId(chapter) ? chapter : "ordinary_days";
}

function formatDisplayDate(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00`);
  return {
    year: String(date.getFullYear()),
    short: `${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`,
  };
}

export default async function ChapterStoryPage({ params }: ChapterPageProps) {
  const { chapterId: rawId } = await params;
  if (!isChapterId(rawId)) {
    notFound();
  }
  const chapterId: ChapterId = rawId;

  const [chapters, published] = await Promise.all([
    getStoryChapters(),
    getPublishedMemories(),
  ]);

  const meta = chapters.find((chapter) => chapter.id === chapterId);
  const title = meta?.title ?? DEFAULT_CHAPTER_LABELS[chapterId];
  const memories = published.filter(
    (memory) => storyChapterKey(memory.chapter) === chapterId,
  );

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 md:py-16">
      <FadeIn>
        <p className="text-xs tracking-[0.25em] text-gold uppercase">Chapter</p>
        <h1 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-md text-sm leading-7 text-muted-ours">
          {meta?.dateRange
            ? `${memories.length} 篇回忆 · ${meta.dateRange}`
            : memories.length > 0
              ? `${memories.length} 篇回忆`
              : "这一章还在等待第一篇回忆。"}
        </p>
      </FadeIn>

      {memories.length === 0 ? (
        <EmptyState
          className="mt-12"
          title="这一章还没有回忆"
          description="发布并归到这一章后，就会出现在这里。"
          actionHref="/story"
          actionLabel="返回故事 →"
        />
      ) : (
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
      )}

      <FadeIn delay={0.2} className="mt-12">
        <Link
          href="/story"
          className="text-sm text-accent-ours underline-offset-4 hover:underline"
        >
          ← 返回故事
        </Link>
      </FadeIn>
    </section>
  );
}
