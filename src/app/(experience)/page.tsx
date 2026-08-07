import { AtmosphereBackground } from "@/components/experience/atmosphere-background";
import { HomeEntries } from "@/components/experience/home-entries";
import { FadeIn } from "@/components/motion/fade-in";
import { getHomeStats } from "@/features/memories/published";

/** Always read live stats (days together, counts) — do not bake "—" at build time. */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const stats = await getHomeStats();

  return (
    <section className="relative flex min-h-[calc(100vh-3.5rem)] flex-1 flex-col overflow-hidden bg-night">
      <AtmosphereBackground />

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

        <FadeIn delay={0.12} className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="一起的第"
            value={stats.daysTogether == null ? "—" : `${stats.daysTogether}`}
            suffix="天"
          />
          <Stat label="回忆" value={`${stats.memoryCount}`} suffix="个" />
          <Stat label="地方" value={`${stats.placeCount}`} suffix="处" />
          <Stat label="照片" value={`${stats.photoCount}`} suffix="张" />
        </FadeIn>

        <FadeIn delay={0.2} className="mt-8">
          <HomeEntries />
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
    <div className="rounded-xl border border-white/10 bg-night/25 px-3 py-2.5 backdrop-blur-sm">
      <p className="text-[11px] text-paper/50">{label}</p>
      <p className="mt-0.5 font-serif text-2xl text-paper">
        {value}
        <span className="ml-0.5 text-sm text-paper/55">{suffix}</span>
      </p>
    </div>
  );
}
