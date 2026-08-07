import Link from "next/link";
import { FadeIn } from "@/components/motion/fade-in";
import { EmptyState } from "@/components/ui/status-blocks";
import { getStoryChapters } from "@/features/memories/published";

export const dynamic = "force-dynamic";

export default async function StoryPage() {
  const chapters = await getStoryChapters();

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 md:py-16">
      <FadeIn>
        <p className="text-xs tracking-[0.25em] text-gold uppercase">Chapters</p>
        <h1 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">我们的故事</h1>
        <p className="mt-3 max-w-md text-sm leading-7 text-muted-ours">
          按章节慢慢读。每一章都是一种相处的样子。
        </p>
      </FadeIn>

      {chapters.length === 0 ? (
        <EmptyState
          className="mt-12"
          title="还没有成章的回忆"
          description="发布第一篇回忆后，故事会按章节慢慢展开。"
          actionHref="/timeline"
          actionLabel="先去时间线看看 →"
        />
      ) : (
        <ol className="mt-10 space-y-8 sm:mt-12">
          {chapters.map((chapter, index) => (
            <FadeIn key={chapter.id} delay={0.05 * index}>
              <li className="border-t border-line pt-6">
                <Link
                  href={`/story/${chapter.id}`}
                  className="group grid gap-4 rounded-xl outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring sm:grid-cols-[140px_1fr] sm:items-center"
                >
                  <div
                    className="aspect-[4/3] overflow-hidden rounded-xl bg-cover bg-center shadow-[0_10px_30px_rgba(32,28,26,0.06)] transition-transform duration-200 group-hover:scale-[1.02] sm:aspect-square"
                    style={
                      chapter.coverUrl
                        ? { backgroundImage: `url(${chapter.coverUrl})` }
                        : { backgroundImage: chapter.coverGradient }
                    }
                    aria-hidden
                  />
                  <div>
                    <p className="text-xs tracking-[0.25em] text-gold">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <h2 className="mt-1 font-serif text-2xl text-ink group-hover:text-accent-ours md:text-3xl">
                      {chapter.title}
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-muted-ours">{chapter.oneLine}</p>
                    <p className="mt-3 text-xs text-muted-ours">
                      {chapter.count} 篇回忆
                      {chapter.dateRange ? ` · ${chapter.dateRange}` : ""}
                      <span className="ml-2 text-accent-ours opacity-0 transition-opacity group-hover:opacity-100">
                        阅读这一章 →
                      </span>
                    </p>
                  </div>
                </Link>
              </li>
            </FadeIn>
          ))}
        </ol>
      )}

      <FadeIn delay={0.2} className="mt-12">
        <Link
          href="/timeline"
          className="text-sm text-accent-ours underline-offset-4 hover:underline"
        >
          前往时间线 →
        </Link>
      </FadeIn>
    </section>
  );
}
