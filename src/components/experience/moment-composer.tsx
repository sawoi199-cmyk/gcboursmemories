"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { ImagePlus, X } from "lucide-react";
import { AuthorToggle, useRememberedAuthor } from "@/components/experience/author-toggle";
import { buttonVariants } from "@/components/ui/button";
import { postMoment } from "@/features/moments/moment-api-client";
import { MOMENT_CAPTION_MAX } from "@/features/moments/moment-schema";
import type { MomentDetail } from "@/features/moments/moments";
import type { CoupleNames } from "@/features/relationship-profile/couple-names";
import {
  appendExifToFormData,
  isHeicLikeFile,
  prepareFileForUpload,
  type PreparedUpload,
} from "@/lib/image/compress-for-upload";
import { cn } from "@/lib/utils";
import { todayLocalIsoDate } from "@/lib/utils/date";

const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";

type MomentComposerProps = {
  names: CoupleNames;
  title?: string;
  /** Prefilled sentence, e.g. the wish being remembered. */
  initialCaption?: string;
  /** Fixed date (e.g. the wish's done date); otherwise the photo's EXIF date or today. */
  initialTakenOn?: string;
  wishId?: string;
  onClose: () => void;
  onCreated: (moment: MomentDetail, warnings: string[]) => void;
};

export function MomentComposer({
  names,
  title = "发一条流光",
  initialCaption = "",
  initialTakenOn,
  wishId,
  onClose,
  onCreated,
}: MomentComposerProps) {
  const inputId = useId();
  const [author, chooseAuthor] = useRememberedAuthor();
  const [prepared, setPrepared] = useState<PreparedUpload | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [caption, setCaption] = useState(initialCaption);
  const [takenOn, setTakenOn] = useState(() => initialTakenOn ?? todayLocalIsoDate());
  const [dateTouched, setDateTouched] = useState(Boolean(initialTakenOn));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setError(null);
    setPreparing(true);
    try {
      const next = await prepareFileForUpload(file);
      setPrepared(next);
      // Browsers outside Safari cannot render HEIC; show the file name instead.
      setPreviewUrl(isHeicLikeFile(next.file) ? null : URL.createObjectURL(next.file));
      if (!dateTouched && next.exif.takenAt) {
        setTakenOn(todayLocalIsoDate(new Date(next.exif.takenAt)));
      }
    } catch {
      setError("这张照片读不出来，换一张试试。");
    } finally {
      setPreparing(false);
    }
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prepared || !caption.trim()) return;
    setBusy(true);
    setError(null);

    const body = new FormData();
    body.append("file", prepared.file);
    appendExifToFormData(body, prepared.exif);
    body.append("caption", caption);
    body.append("takenOn", takenOn);
    body.append("author", author);
    if (wishId) body.append("wishId", wishId);

    const result = await postMoment(body);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onCreated(result.data.moment, result.data.warnings);
  }

  // Portal: the experience content sits in its own stacking context below the sticky nav.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end justify-center bg-night/60 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <form
        onSubmit={(event) => void onSubmit(event)}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl bg-background px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl text-ink">{title}</h2>
          <button
            type="button"
            aria-label="关闭"
            disabled={busy}
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full text-muted-ours hover:bg-paper hover:text-ink disabled:opacity-50"
          >
            <X className="size-4" />
          </button>
        </div>

        <label
          htmlFor={inputId}
          className={cn(
            "relative mt-4 grid aspect-square w-full cursor-pointer place-items-center overflow-hidden rounded-2xl border border-line bg-paper",
            !prepared && "border-dashed",
            busy && "pointer-events-none",
          )}
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="已选照片预览" className="absolute inset-0 h-full w-full object-cover" />
          ) : prepared ? (
            <span className="px-6 text-center text-sm text-muted-ours">
              已选择 {prepared.file.name}
              <span className="mt-1 block text-xs">（这个格式无法预览，发布后会生成缩略图）</span>
            </span>
          ) : (
            <span className="flex flex-col items-center gap-2 text-muted-ours">
              <ImagePlus className="size-8" aria-hidden />
              <span className="text-sm">{preparing ? "正在读取照片…" : "选一张照片"}</span>
            </span>
          )}
          {prepared ? (
            <span className="absolute right-3 bottom-3 rounded-full bg-night/55 px-3 py-1 text-xs text-paper backdrop-blur-sm">
              {preparing ? "读取中…" : "换一张"}
            </span>
          ) : null}
        </label>
        <input
          id={inputId}
          type="file"
          accept={PHOTO_ACCEPT}
          className="sr-only"
          disabled={busy || preparing}
          onChange={(event) => {
            void onPick(event.target.files?.[0]);
            event.target.value = "";
          }}
        />

        <label htmlFor={`${inputId}-caption`} className="sr-only">
          一句话
        </label>
        <textarea
          id={`${inputId}-caption`}
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          maxLength={MOMENT_CAPTION_MAX}
          rows={2}
          placeholder="写一句话…"
          className="mt-4 w-full resize-none bg-transparent font-serif text-lg leading-7 text-ink outline-none placeholder:text-muted-ours/70"
        />
        <p className="text-right text-xs text-muted-ours">
          {caption.length}/{MOMENT_CAPTION_MAX}
        </p>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
          <AuthorToggle author={author} names={names} onChange={chooseAuthor} />
          <label className="flex items-center gap-2 text-xs text-muted-ours">
            日期
            <input
              type="date"
              value={takenOn}
              max={todayLocalIsoDate()}
              required
              onChange={(event) => {
                setTakenOn(event.target.value);
                setDateTouched(true);
              }}
              className="rounded-lg border border-line bg-background px-2 py-1 text-sm text-ink outline-none focus:border-gold"
            />
          </label>
        </div>

        {error ? <p className="mt-3 text-sm text-accent-ours">{error}</p> : null}

        <button
          type="submit"
          disabled={busy || preparing || !prepared || !caption.trim() || !takenOn}
          className={cn(buttonVariants({ size: "lg" }), "mt-5 w-full")}
        >
          {busy ? "发布中…（上传原图需要一点时间）" : "发布"}
        </button>
      </form>
    </div>,
    document.body,
  );
}
