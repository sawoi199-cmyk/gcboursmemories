"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Pencil, Trash2 } from "lucide-react";
import { authorName } from "@/components/experience/author-toggle";
import { PhotoLightbox } from "@/components/photo-viewer/lightbox";
import { FadeIn } from "@/components/motion/fade-in";
import { buttonVariants } from "@/components/ui/button";
import { patchMoment, removeMoment } from "@/features/moments/moment-api-client";
import { MOMENT_CAPTION_MAX } from "@/features/moments/moment-schema";
import type { MomentDetail } from "@/features/moments/moments";
import type { CoupleNames } from "@/features/relationship-profile/couple-names";
import { formatDottedDate, todayLocalIsoDate } from "@/lib/utils/date";

type MomentViewProps = {
  initialMoment: MomentDetail;
  names: CoupleNames;
};

export function MomentView({ initialMoment, names }: MomentViewProps) {
  const router = useRouter();
  const [moment, setMoment] = useState(initialMoment);
  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(moment.caption);
  const [takenOn, setTakenOn] = useState(moment.takenOn);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const aspectRatio =
    moment.width && moment.height ? `${moment.width} / ${moment.height}` : "1 / 1";

  async function onSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await patchMoment(moment.id, { caption, takenOn });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setMoment(result.data);
    setEditing(false);
  }

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
    <article className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 md:py-14">
      <Link
        href="/moments"
        className="text-sm text-muted-ours underline-offset-4 hover:text-ink hover:underline"
      >
        ← 流光
      </Link>

      <FadeIn className="mt-5">
        <div
          className="relative w-full overflow-hidden rounded-2xl bg-paper bg-[linear-gradient(135deg,#efe4d6,#f7efe6)] shadow-[0_10px_30px_rgba(32,28,26,0.08)]"
          style={{ aspectRatio }}
        >
          {moment.thumbnailUrl ? (
            <PhotoLightbox
              items={[{ photoId: moment.photoId, alt: moment.caption, thumbnailUrl: moment.thumbnailUrl }]}
              className="absolute inset-0 h-full"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={moment.thumbnailUrl}
                alt={moment.caption}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </PhotoLightbox>
          ) : null}
        </div>
      </FadeIn>

      {editing ? (
        <form onSubmit={(event) => void onSave(event)} className="mt-6 space-y-3">
          <textarea
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            maxLength={MOMENT_CAPTION_MAX}
            rows={2}
            required
            aria-label="一句话"
            className="w-full resize-none rounded-xl border border-line bg-background px-3 py-2 font-serif text-lg leading-7 text-ink outline-none focus:border-gold"
          />
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-muted-ours">
              日期
              <input
                type="date"
                value={takenOn}
                max={todayLocalIsoDate()}
                required
                onChange={(event) => setTakenOn(event.target.value)}
                className="rounded-lg border border-line bg-background px-2 py-1 text-sm text-ink outline-none focus:border-gold"
              />
            </label>
            <span className="flex-1" />
            <button
              type="submit"
              disabled={busy || !caption.trim() || !takenOn}
              className={buttonVariants({ size: "sm" })}
            >
              {busy ? "保存中…" : "保存"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCaption(moment.caption);
                setTakenOn(moment.takenOn);
                setEditing(false);
              }}
              className={buttonVariants({ size: "sm", variant: "ghost" })}
            >
              取消
            </button>
          </div>
        </form>
      ) : (
        <div className="mt-6">
          <p className="font-serif text-xl leading-9 break-words whitespace-pre-wrap text-ink">
            {moment.caption}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <p className="flex-1 text-xs text-muted-ours">
              {authorName(moment.author, names)} · {formatDottedDate(moment.takenOn)}
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
        </div>
      )}

      {moment.wish ? (
        <Link
          href={`/wishes?tab=done#wish-${moment.wish.id}`}
          className="mt-5 inline-flex max-w-full items-center gap-1.5 rounded-full border border-gold/50 bg-gold/10 px-3 py-1.5 text-xs text-ink transition-colors hover:bg-gold/20"
        >
          <Check className="size-3.5 shrink-0 text-gold" aria-hidden />
          <span className="truncate">实现了愿望：{moment.wish.title}</span>
        </Link>
      ) : null}

      {error ? <p className="mt-3 text-sm text-accent-ours">{error}</p> : null}
    </article>
  );
}
