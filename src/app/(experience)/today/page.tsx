import Link from "next/link";
import { FadeIn } from "@/components/motion/fade-in";

export default function TodayPage() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16">
      <FadeIn>
        <p className="text-xs tracking-[0.25em] text-gold uppercase">Today</p>
        <h1 className="mt-3 font-serif text-4xl text-ink">今日</h1>
        <p className="mt-4 max-w-md text-sm leading-7 text-muted-ours">
          回到这一天，看看我们曾经一起留下的痕迹。
        </p>
        <Link href="/timeline" className="mt-8 inline-block text-sm text-accent-ours underline-offset-4 hover:underline">
          先去时间线看看 →
        </Link>
      </FadeIn>
    </section>
  );
}
