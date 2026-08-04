import Link from "next/link";
import { FadeIn } from "@/components/motion/fade-in";
import { getSiteOwnerId } from "@/lib/config/site-owner";
import { createServiceClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/** Always read live Studio lists; do not serve a stale prerender after publish. */
export const dynamic = "force-dynamic";

type MemoryRow = {
  id: string;
  title: string;
  eventDate: string;
  status: "draft" | "published" | "archived";
  slug: string;
  meta: string;
};

export default async function StudioDraftsPage() {
  let memories: MemoryRow[] = [];

  if (isSupabaseConfigured()) {
    try {
      const ownerId = getSiteOwnerId();
      const supabase = createServiceClient();
      const { data } = await supabase
        .from("memory_events")
        .select("id, title, event_date, updated_at, status, slug, event_photos(count)")
        .eq("owner_id", ownerId)
        .in("status", ["draft", "published"])
        .order("updated_at", { ascending: false });

      memories = (data ?? []).map((item) => {
        const countRelation = Array.isArray(item.event_photos)
          ? item.event_photos[0]
          : item.event_photos;
        const count =
          countRelation && typeof countRelation === "object" && "count" in countRelation
            ? Number(countRelation.count)
            : 0;
        return {
          id: item.id,
          title: item.title,
          eventDate: item.event_date,
          status: item.status,
          slug: item.slug,
          meta: `${count} 张 · 更新于 ${new Date(item.updated_at).toLocaleString("zh-CN")}`,
        };
      });
    } catch {
      memories = [];
    }
  }

  const drafts = memories.filter((item) => item.status === "draft");
  const published = memories.filter((item) => item.status === "published");

  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-12">
      <FadeIn>
        <p className="text-xs tracking-[0.2em] text-gold uppercase">Memories</p>
        <h1 className="mt-2 font-serif text-3xl text-ink">回忆</h1>
        <p className="mt-2 text-sm text-muted-ours">
          草稿和已发布都可以点进去继续编辑。已发布保存后，前台会立刻更新。
        </p>
      </FadeIn>

      <div className="mt-10">
        <h2 className="font-serif text-xl text-ink">已发布</h2>
        <ul className="mt-4 space-y-3">
          {published.length > 0 ? (
            published.map((memory) => <MemoryLink key={memory.id} memory={memory} />)
          ) : (
            <li className="rounded-2xl border border-dashed border-line px-4 py-8 text-sm text-muted-ours">
              还没有已发布的回忆。
            </li>
          )}
        </ul>
      </div>

      <div className="mt-10">
        <h2 className="font-serif text-xl text-ink">草稿</h2>
        <ul className="mt-4 space-y-3">
          {drafts.length > 0 ? (
            drafts.map((memory) => <MemoryLink key={memory.id} memory={memory} />)
          ) : (
            <li className="rounded-2xl border border-dashed border-line px-4 py-8 text-sm text-muted-ours">
              还没有草稿。去{" "}
              <Link href="/studio/upload" className="underline">
                上传
              </Link>{" "}
              开始。
            </li>
          )}
        </ul>
      </div>
    </section>
  );
}

function MemoryLink({ memory }: { memory: MemoryRow }) {
  return (
    <li>
      <Link
        href={`/studio/memories/${memory.id}/edit`}
        className="block rounded-2xl border border-line bg-paper px-4 py-4 hover:border-ink/20"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-serif text-xl text-ink">{memory.title}</p>
          <span className="text-[11px] tracking-wide text-muted-ours">
            {memory.status === "published" ? "已发布 · 点此编辑" : "草稿 · 点此编辑"}
          </span>
        </div>
        <p className="mt-1 text-xs text-muted-ours">
          {memory.eventDate} · {memory.meta}
          {memory.status === "published" ? ` · /memory/${memory.slug}` : ""}
        </p>
      </Link>
    </li>
  );
}
