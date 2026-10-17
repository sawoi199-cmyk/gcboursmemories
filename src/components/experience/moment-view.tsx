"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { Check, Pencil, Trash2 } from "lucide-react";
import { authorName } from "@/components/experience/author-toggle";
import { MomentComposer } from "@/components/experience/moment-composer";
import { MomentSocialPanel } from "@/components/experience/moment-social-panel";
import { MomentCard } from "@/components/moments/moment-card";
import { PhotoLightbox } from "@/components/photo-viewer/lightbox";
import { FadeIn } from "@/components/motion/fade-in";
import { removeMoment } from "@/features/moments/moment-api-client";
import type { MomentDetail } from "@/features/moments/moments";
import type { CoupleNames } from "@/features/relationship-profile/couple-names";
import { formatDottedDate } from "@/lib/utils/date";

type MomentViewProps = {
  initialMoment: MomentDetail;
  names: CoupleNames;
};

export function MomentView({ initialMoment, names }: MomentViewProps) {
  const router = useRouter();
  const [moment, setMoment] = useState(initialMoment);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captionClipped, setCaptionClipped] = useState(false);
  const cardWrapRef = useRef<HTMLDivElement | null>(null);

  // The card clamps long captions to fit its frame; show the full sentence below when that happens.
  useLayoutEffect(() => {
    const node = cardWrapRef.current?.querySelector<HTMLElement>("[data-moment-caption]");
    if (!node) return;
    const measure = () => setCaptionClipped(node.scrollHeight > node.clientHeight + 1);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [moment]);

  async function onDelete() {
    if (!window.confirm("删除这条流光？照片原图也会一起删除，无法恢复。")) return;
    setBusy(true);
    setError(null);
    const result = await removeMoment(moment.id);
    if (!result.ok) {
      setBusy(false);
      setError(result.message);
      return;
    }
    router.push("/moments");
    router.refresh();
  }

  return (
    <article className="mx-auto w-full max-w-md px-4 py-8 sm:px-6 md:py-14">
      <Link
        href="/moments"
        className="text-sm text-muted-ours underline-offset-4 hover:text-ink hover:underline"
      >
        ← 流光
      </Link>

      <FadeIn className="mt-5">
        <div
          ref={cardWrapRef}
          className="overflow-hidden rounded-2xl shadow-[0_12px_32px_rgba(32,28,26,0.12)]"
        >
          {moment.thumbnailUrl ? (
            <PhotoLightbox
              items={[{ photoId: moment.photoId, alt: moment.caption, thumbnailUrl: moment.thumbnailUrl }]}
            >
              <MomentCard
                photoUrl={moment.thumbnailUrl}
                caption={moment.caption}
                takenOn={moment.takenOn}
                layout={moment.layout}
              />
            </PhotoLightbox>
          ) : (
            <MomentCard
              photoUrl={null}
              caption={moment.caption}
              takenOn={moment.takenOn}
              layout={moment.layout}
            />
          )}
        </div>
      </FadeIn>

      {captionClipped ? (
        <p className="mt-5 font-serif text-lg leading-8 break-words whitespace-pre-wrap text-ink">
          {moment.caption}
        </p>
      ) : null}

      <div className="mt-4 flex items-center gap-3">
        <p className="flex-1 text-xs text-muted-ours">
          {authorName(moment.author, names)} · {formatDottedDate(moment.takenOn)} · 点照片看原图
        </p>
        <button
          type="button"
          aria-label="编辑"
          title="编辑"
          disabled={busy}
          onClick={() => setEditing(true)}
          className="grid size-8 place-items-center rounded-md text-muted-ours hover:bg-paper hover:text-ink disabled:opacity-50"
        >
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          aria-label="删除"
          title="删除"
          disabled={busy}
          onClick={() => void onDelete()}
          className="grid size-8 place-items-center rounded-md text-muted-ours hover:bg-paper hover:text-ink disabled:opacity-50"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {moment.wish ? (
        <Link
          href={`/wishes?tab=done#wish-${moment.wish.id}`}
          className="mt-4 inline-flex max-w-full items-center gap-1.5 rounded-full border border-gold/50 bg-gold/10 px-3 py-1.5 text-xs text-ink transition-colors hover:bg-gold/20"
        >
          <Check className="size-3.5 shrink-0 text-gold" aria-hidden />
          <span className="truncate">实现了愿望：{moment.wish.title}</span>
        </Link>
      ) : null}

      {error ? <p className="mt-3 text-sm text-accent-ours">{error}</p> : null}

      <MomentSocialPanel
        momentId={moment.id}
        initialComments={moment.comments}
        initialLikedBy={moment.likedBy}
        names={names}
      />

      {editing ? (
        <MomentComposer
          names={names}
          existing={moment}
          onClose={() => setEditing(false)}
          onCreated={(saved) => {
            setEditing(false);
            setMoment(saved);
            router.refresh();
          }}
        />
      ) : null}
    </article>
  );
}
