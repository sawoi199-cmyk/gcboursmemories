import { LetterContent } from "@/components/experience/letter-content";
import { EmptyState } from "@/components/ui/status-blocks";
import { mockLetter } from "@/config/mock-data";
import { getPublishedLetter } from "@/features/letters/get-published-letter";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

export default async function LetterPage() {
  const letter = await getPublishedLetter();

  if (!letter && isSupabaseConfigured()) {
    return (
      <section className="mx-auto w-full max-w-3xl px-6 py-16">
        <EmptyState
          title="这封信还没有发布"
          description="发布后，它会在这里等待被再次阅读。"
          actionHref="/timeline"
          actionLabel="先去时间线看看 →"
        />
      </section>
    );
  }

  return <LetterContent letter={letter ?? mockLetter} canReply={Boolean(letter)} />;
}
