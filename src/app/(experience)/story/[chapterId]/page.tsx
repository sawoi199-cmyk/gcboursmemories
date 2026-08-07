import Link from "next/link";
import { notFound } from "next/navigation";
import { ChapterMemoriesList } from "@/components/experience/chapter-memories-list";
import { FadeIn } from "@/components/motion/fade-in";
import { EmptyState } from "@/components/ui/status-blocks";
import { isChapterId, type ChapterId } from "@/config/chapters";
import {
  getPublishedChapterMeta,
  getPublishedChapterPage,
} from "@/features/memories/published";

export const dynamic = "force-dynamic";

type ChapterPageProps = {
  params: Promise<{ chapterId: string }>;
};

export default async function ChapterStoryPage({ params }: ChapterPageProps) {
  const { chapterId: rawId } = await params;
  if (!isChapterId(rawId)) {
    notFound();
  }
  const chapterId: ChapterId = rawId;

  const [meta, page] = await Promise.all([
    getPublishedChapterMeta(chapterId),
    getPublishedChapterPage({ chapterId }),
  ]);

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 md:py-16">
      <FadeIn>
        <p className="text-xs tracking-[0.25em] text-gold uppercase">Chapter</p>
        <h1 className="mt-3 font-serif text-3xl text-ink sm:text-4xl">{meta.title}</h1>
        <p className="mt-3 max-w-md text-sm leading-7 text-muted-ours">
          {meta.count > 0
            ? `${meta.count} 篇回忆${meta.dateRange ? ` · ${meta.dateRange}` : ""}`
            : "这一章还在等待第一篇回忆。"}
        </p>
      </FadeIn>

      {meta.count === 0 ? (
        <EmptyState
          className="mt-12"
          title="这一章还没有回忆"
          description="发布并归到这一章后，就会出现在这里。"
          actionHref="/story"
          actionLabel="返回故事 →"
        />
      ) : (
        <ChapterMemoriesList
          chapterId={chapterId}
          initialMemories={page.memories}
          initialCursor={page.nextCursor}
        />
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
