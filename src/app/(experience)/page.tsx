import Link from "next/link";
import { FadeIn } from "@/components/motion/fade-in";
import { buttonVariants } from "@/components/ui/button";
import { getHomeStats } from "@/features/memories/published";
import { cn } from "@/lib/utils";

/** Always read live stats (days together, counts) — do not bake "—" at build time. */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const stats = await getHomeStats();

  return (
    <section className="relative flex min-h-[calc(100vh-3.5rem)] flex-1 flex-col overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(165deg, #111216 0%, #1b1d22 35%, #3a2e2a 70%, #f6f1ea 100%)",
        }}
      />
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(198,161,91,0.18),transparent_45%)]" />

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col justify-end px-6 pb-16 pt-24 md:justify-center md:pb-24">
        <FadeIn>
          <p className="text-xs tracking-[0.28em] text-gold uppercase">OURS</p>
          <h1 className="mt-5 max-w-xl font-serif text-4xl leading-[1.15] text-paper md:text-5xl">
            为你保存的每一个瞬间。
          </h1>
          <p className="mt-4 max-w-md text-sm leading-7 text-paper/70">
            有些照片记录了一天。有些照片，记录了我们。
          </p>
        </FadeIn>

        <FadeIn delay={0.12} className="mt-10 grid gap-4 sm:grid-cols-2">
          <Stat
            label="我们一起的第"
            value={stats.daysTogether == null ? "—" : `${stats.daysTogether}`}
            suffix="天"
          />
          <Stat label="共同记录的" value={`${stats.memoryCount}`} suffix="个回忆" />
          <Stat label="去过的" value={`${stats.placeCount}`} suffix="个地方" />
          <Stat label="收藏的" value={`${stats.photoCount}`} suffix="张照片" />
        </FadeIn>

        <FadeIn delay={0.2} className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/story"
            className={cn(buttonVariants({ size: "lg" }), "bg-paper text-ink hover:bg-paper/90")}
          >
            打开我们的故事
          </Link>
          <Link
            href="/timeline"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "border-paper/30 bg-transparent text-paper hover:bg-paper/10 hover:text-paper",
            )}
          >
            时间线
          </Link>
        </FadeIn>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string;
  suffix: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-night/30 px-4 py-3 backdrop-blur-sm">
      <p className="text-xs text-paper/55">{label}</p>
      <p className="mt-1 font-serif text-3xl text-paper">
        {value}
        <span className="ml-1 text-base text-paper/60">{suffix}</span>
      </p>
    </div>
  );
}
