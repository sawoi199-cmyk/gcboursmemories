import Link from "next/link";
import { FadeIn } from "@/components/motion/fade-in";
import { buttonVariants } from "@/components/ui/button";
import { getSiteOwnerId } from "@/lib/config/site-owner";
import { createServiceClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { cn } from "@/lib/utils";

/** Always read live Studio lists; do not serve a stale prerender after publish. */
export const dynamic = "force-dynamic";

type OverviewMemory = {
  id: string;
  title: string;
  eventDate: string;
  status: "draft" | "published" | "archived";
  slug: string;
  meta: string;
};

export default async function StudioPage() {
  let memories: OverviewMemory[] = [];
  let photoCount = 0;

  if (isSupabaseConfigured()) {
    try {
      const ownerId = getSiteOwnerId();
      const supabase = createServiceClient();
      const [{ data }, photoResult] = await Promise.all([
        supabase
          .from("memory_events")
          .select("id, title, event_date, updated_at, status, slug, event_photos(count)")
          .eq("owner_id", ownerId)
          .in("status", ["draft", "published"])
          .order("updated_at", { ascending: false })
          .limit(12),
        supabase
          .from("photos")
          .select("id", { count: "exact", head: true })
          .eq("owner_id", ownerId),
      ]);

      photoCount = photoResult.count ?? 0;
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
          meta: `${count} 张 · ${new Date(item.updated_at).toLocaleString("zh-CN")}`,
        };
      });
    } catch {
      memories = [];
      photoCount = 0;
    }
  }

  const drafts = memories.filter((item) => item.status === "draft");
  const published = memories.filter((item) => item.status === "published");

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-12">
      <FadeIn className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.2em] text-gold uppercase">Studio</p>
          <h1 className="mt-2 font-serif text-3xl text-ink">管理后台</h1>
          <p className="mt-2 text-sm text-muted-ours">
            上传、整理、发布。已发布的回忆也可随时回来修改。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/studio/drafts" className={cn(buttonVariants({ variant: "outline", size: "lg" }))}>
            全部回忆
          </Link>
          <Link href="/studio/upload" className={cn(buttonVariants({ size: "lg" }))}>
            快速上传
          </Link>
        </div>
      </FadeIn>

      <dl className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="总照片数" value={photoCount} />
        <Stat label="已发布回忆" value={published.length} />
        <Stat label="草稿" value={drafts.length} />
        <Stat label="最近条目" value={memories.length} />
      </dl>

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <section>
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-serif text-xl text-ink">草稿</h2>
            <Link href="/studio/drafts" className="text-xs text-muted-ours underline">
              查看全部
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {drafts.slice(0, 5).map((draft) => (
              <li key={draft.id}>
                <Link
                  href={`/studio/memories/${draft.id}/edit`}
                  className="block rounded-2xl border border-line bg-paper px-4 py-3 transition-colors hover:border-ink/20"
                >
                  <p className="font-medium text-ink">{draft.title}</p>
                  <p className="mt-1 text-xs text-muted-ours">
                    {draft.eventDate} · {draft.meta}
                  </p>
                </Link>
              </li>
            ))}
            {drafts.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-muted-ours">
                暂无草稿
              </li>
            ) : null}
          </ul>
        </section>

        <section>
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="font-serif text-xl text-ink">已发布（点标题编辑）</h2>
            <Link href="/studio/drafts" className="text-xs text-muted-ours underline">
              查看全部
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {published.slice(0, 5).map((memory) => (
              <li key={memory.id}>
                <Link
                  href={`/studio/memories/${memory.id}/edit`}
                  className="block rounded-2xl border border-line bg-paper px-4 py-3 transition-colors hover:border-ink/20"
                >
                  <p className="font-medium text-ink">{memory.title}</p>
                  <p className="mt-1 text-xs text-muted-ours">
                    {memory.eventDate} · {memory.meta} · 编辑
                  </p>
                </Link>
              </li>
            ))}
            {published.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-muted-ours">
                暂无已发布回忆
              </li>
            ) : null}
          </ul>
        </section>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-paper p-4">
      <dt className="text-xs text-muted-ours">{label}</dt>
      <dd className="mt-1 font-serif text-3xl text-ink">{value}</dd>
    </div>
  );
}
