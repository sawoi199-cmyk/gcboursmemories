"use client";

import Link from "next/link";
import { useState } from "react";
import { FadeIn } from "@/components/motion/fade-in";
import { buttonVariants } from "@/components/ui/button";
import type { PublishedLetter } from "@/features/letters/get-published-letter";
import { cn } from "@/lib/utils";

export function LetterContent({ letter }: { letter: PublishedLetter }) {
  const paragraphs = letter.body.split("\n\n");
  const [visibleCount, setVisibleCount] = useState(paragraphs.length);

  function reread() {
    setVisibleCount(0);
    paragraphs.forEach((_, index) => {
      window.setTimeout(() => {
        setVisibleCount((current) => Math.max(current, index + 1));
      }, 400 * (index + 1));
    });
  }

  return (
    <article className="mx-auto w-full max-w-[720px] px-6 py-12 md:py-16">
      <FadeIn>
        <p className="text-xs tracking-[0.25em] text-gold uppercase">Letter</p>
        <h1 className="mt-3 font-serif text-4xl text-ink">{letter.title}</h1>
        {letter.letterDate ? (
          <p className="mt-2 text-xs text-muted-ours">{letter.letterDate}</p>
        ) : null}
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="relative mt-10 overflow-hidden rounded-2xl border border-line bg-paper px-8 py-10 shadow-[0_18px_50px_rgba(32,28,26,0.06)] md:px-12 md:py-14">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "linear-gradient(#e8ded4 1px, transparent 1px)",
              backgroundSize: "100% 2rem",
            }}
          />
          <div className="relative space-y-6">
            {paragraphs.slice(0, visibleCount).map((paragraph, index) => (
              <p
                key={`${paragraph}-${index}`}
                className="whitespace-pre-wrap font-serif text-lg leading-9 text-ink/90"
              >
                {paragraph}
              </p>
            ))}
          </div>
          <p className="relative mt-12 font-serif text-base text-ink/70">——你的档案管理员</p>
        </div>
      </FadeIn>

      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" onClick={reread} className={cn(buttonVariants({ variant: "outline" }))}>
          重新阅读
        </button>
        <Link href="/studio/upload" className={cn(buttonVariants())}>
          继续记录我们的故事
        </Link>
      </div>
    </article>
  );
}
