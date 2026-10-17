"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { ImagePlus, Trash2, X } from "lucide-react";
import { AuthorToggle, useRememberedAuthor } from "@/components/experience/author-toggle";
import { CAPTION_TARGET, MomentCard } from "@/components/moments/moment-card";
import { DECO_LABELS, DecoArt } from "@/components/moments/moment-decos";
import { buttonVariants } from "@/components/ui/button";
import { patchMoment, postMoment } from "@/features/moments/moment-api-client";
import {
  DECO_STICKERS,
  DEFAULT_TEXT,
  EMOJI_STICKERS,
  FLOATING_TEXT_TEMPLATES,
  MAX_STICKERS,
  MOMENT_TEMPLATES,
  STICKER_SCALE_MAX,
  STICKER_SCALE_MIN,
  TEMPLATE_LABELS,
  TEXT_SCALE_MAX,
  TEXT_SCALE_MIN,
  TEXT_STYLES,
  TEXT_STYLE_LABELS,
  clampFraction,
  defaultLayout,
  textFor,
  textScaleOf,
  type DecoSticker,
  type MomentLayout,
  type MomentSticker,
  type MomentTemplate,
  type MomentTextStyle,
} from "@/features/moments/moment-layout";
import { MOMENT_CAPTION_MAX } from "@/features/moments/moment-schema";
import type { MomentDetail } from "@/features/moments/moments";
import type { CoupleNames } from "@/features/relationship-profile/couple-names";
import type { WishAuthor } from "@/features/wishes/wish-schema";
import {
  appendExifToFormData,
  isHeicLikeFile,
  prepareFileForUpload,
  type PreparedUpload,
} from "@/lib/image/compress-for-upload";
import { cn } from "@/lib/utils";
import { todayLocalIsoDate } from "@/lib/utils/date";

const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";

type Tool = "template" | "sticker" | "text";

type MomentComposerProps = {
  names: CoupleNames;
  title?: string;
  /** Edit an existing moment (photo stays); omit to post a new one. */
  existing?: MomentDetail;
  /** Prefilled sentence for a new moment, e.g. the wish being remembered. */
  initialCaption?: string;
  /** Fixed date for a new moment (e.g. the wish's done date); otherwise EXIF date or today. */
  initialTakenOn?: string;
  wishId?: string;
  onClose: () => void;
  onCreated: (moment: MomentDetail, warnings: string[]) => void;
};

type DragState = { id: string; offsetX: number; offsetY: number };

function newStickerId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

type NewSticker = { kind: "emoji"; value: string } | { kind: "deco"; value: DecoSticker };

/** A new sticker near the middle of the card, slightly offset and tilted so it feels hand-placed. */
function createSticker(sticker: NewSticker): MomentSticker {
  const jitter = () => (Math.random() - 0.5) * 0.2;
  return {
    id: newStickerId(),
    ...sticker,
    x: clampFraction(0.5 + jitter()),
    y: clampFraction(0.42 + jitter()),
    scale: 1,
    rotate: Math.round((Math.random() - 0.5) * 24),
  } as MomentSticker;
}

function withTemplate(layout: MomentLayout, template: MomentTemplate): MomentLayout {
  const floating = template === "overlay" || template === "magazine";
  return {
    ...layout,
    template,
    text: floating ? (layout.text && layout.template === template ? layout.text : DEFAULT_TEXT[template]) : layout.text,
  };
}

export function MomentComposer({
  names,
  title,
  existing,
  initialCaption = "",
  initialTakenOn,
  wishId,
  onClose,
  onCreated,
}: MomentComposerProps) {
  const inputId = useId();
  const isEdit = Boolean(existing);
  const [rememberedAuthor, chooseRememberedAuthor] = useRememberedAuthor();
  const [editAuthor, setEditAuthor] = useState<WishAuthor | null>(existing?.author ?? null);
  const author = editAuthor ?? rememberedAuthor;

  const [prepared, setPrepared] = useState<PreparedUpload | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [caption, setCaption] = useState(existing?.caption ?? initialCaption);
  const [takenOn, setTakenOn] = useState(
    () => existing?.takenOn ?? initialTakenOn ?? todayLocalIsoDate(),
  );
  const [dateTouched, setDateTouched] = useState(Boolean(existing ?? initialTakenOn));
  const [layout, setLayout] = useState<MomentLayout>(existing?.layout ?? defaultLayout());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>("template");
  const [customEmoji, setCustomEmoji] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cardRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);

  const photoUrl = existing ? existing.thumbnailUrl : previewUrl;
  const hasPhoto = isEdit || prepared !== null;
  const selectedSticker = layout.stickers.find((sticker) => sticker.id === selectedId) ?? null;
  const floatingText = textFor(layout);
  const canFloatText = FLOATING_TEXT_TEMPLATES.includes(layout.template);

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

  function chooseAuthor(next: WishAuthor) {
    if (isEdit) setEditAuthor(next);
    else chooseRememberedAuthor(next);
  }

  async function onPick(file: File | undefined) {
    if (!file) return;
    setError(null);
    setPreparing(true);
    try {
      const next = await prepareFileForUpload(file);
      setPrepared(next);
      // Browsers outside Safari cannot render HEIC; the card shows a placeholder.
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

  function updateSticker(id: string, patch: Partial<Pick<MomentSticker, "x" | "y" | "scale" | "rotate">>) {
    setLayout((current) => ({
      ...current,
      stickers: current.stickers.map((sticker) =>
        sticker.id === id ? ({ ...sticker, ...patch } as MomentSticker) : sticker,
      ),
    }));
  }

  function updateText(patch: Partial<NonNullable<MomentLayout["text"]>>) {
    setLayout((current) => {
      const base = textFor(current);
      return base ? { ...current, text: { ...base, ...patch } } : current;
    });
  }

  function addSticker(sticker: NewSticker) {
    if (layout.stickers.length >= MAX_STICKERS) {
      setError(`一条流光最多 ${MAX_STICKERS} 个贴纸。`);
      return;
    }
    const next = createSticker(sticker);
    setLayout((current) => ({ ...current, stickers: [...current.stickers, next] }));
    setSelectedId(next.id);
  }

  function removeSelected() {
    if (!selectedId || selectedId === CAPTION_TARGET) return;
    setLayout((current) => ({
      ...current,
      stickers: current.stickers.filter((sticker) => sticker.id !== selectedId),
    }));
    setSelectedId(null);
  }

  function positionOf(id: string) {
    if (id === CAPTION_TARGET) return floatingText;
    return layout.stickers.find((sticker) => sticker.id === id) ?? null;
  }

  function onPiecePointerDown(id: string, event: ReactPointerEvent<HTMLElement>) {
    const card = cardRef.current;
    const position = positionOf(id);
    if (!card || !position) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = card.getBoundingClientRect();
    dragRef.current = {
      id,
      offsetX: event.clientX - (rect.left + position.x * rect.width),
      offsetY: event.clientY - (rect.top + position.y * rect.height),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(id);
  }

  function onCardPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const card = cardRef.current;
    if (!drag || !card) return;
    const rect = card.getBoundingClientRect();
    const x = clampFraction((event.clientX - drag.offsetX - rect.left) / rect.width);
    const y = clampFraction((event.clientY - drag.offsetY - rect.top) / rect.height);
    if (drag.id === CAPTION_TARGET) updateText({ x, y });
    else updateSticker(drag.id, { x, y });
  }

  function endDrag() {
    dragRef.current = null;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!caption.trim() || !takenOn) return;
    setBusy(true);
    setError(null);

    if (existing) {
      const result = await patchMoment(existing.id, { caption, takenOn, author, layout });
      setBusy(false);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      onCreated(result.data, []);
      return;
    }

    if (!prepared) {
      setBusy(false);
      return;
    }
    const body = new FormData();
    body.append("file", prepared.file);
    appendExifToFormData(body, prepared.exif);
    body.append("caption", caption);
    body.append("takenOn", takenOn);
    body.append("author", author);
    body.append("layout", JSON.stringify(layout));
    if (wishId) body.append("wishId", wishId);

    const result = await postMoment(body);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onCreated(result.data.moment, result.data.warnings);
  }

  const heading = title ?? (isEdit ? "编辑流光" : "发一条流光");

  // Portal: the experience content sits in its own stacking context below the sticky nav.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={heading}
      className="fixed inset-0 z-50 flex items-end justify-center bg-night/60 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <form
        onSubmit={(event) => void onSubmit(event)}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[94dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl bg-background px-5 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-xl text-ink">{heading}</h2>
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

        {hasPhoto ? (
          <>
            <div
              ref={cardRef}
              onPointerMove={onCardPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onPointerDown={() => setSelectedId(null)}
              className="mx-auto mt-4 w-full max-w-[320px] overflow-hidden rounded-xl shadow-[0_8px_24px_rgba(32,28,26,0.12)]"
            >
              <MomentCard
                photoUrl={photoUrl}
                caption={caption}
                takenOn={takenOn}
                layout={layout}
                interaction={{ selectedId, onPointerDown: onPiecePointerDown }}
              />
            </div>
            <div className="mx-auto mt-2 flex max-w-[320px] items-center justify-between text-xs text-muted-ours">
              <span>{prepared && !previewUrl ? "这个格式无法预览，发布后会生成缩略图" : "拖动贴纸或文字可以调整位置"}</span>
              {!isEdit ? (
                <label htmlFor={inputId} className="shrink-0 cursor-pointer underline underline-offset-4 hover:text-ink">
                  {preparing ? "读取中…" : "换一张"}
                </label>
              ) : null}
            </div>

            {selectedSticker || (selectedId === CAPTION_TARGET && floatingText) ? (
              <div className="mt-3 space-y-2 rounded-2xl border border-line bg-paper px-4 py-3">
                {selectedSticker ? (
                  <RangeRow
                    label="大小"
                    min={STICKER_SCALE_MIN}
                    max={STICKER_SCALE_MAX}
                    step={0.05}
                    value={selectedSticker.scale}
                    onChange={(scale) => updateSticker(selectedSticker.id, { scale })}
                  />
                ) : null}
                <RangeRow
                  label="旋转"
                  min={-180}
                  max={180}
                  step={1}
                  value={selectedSticker ? selectedSticker.rotate : (floatingText?.rotate ?? 0)}
                  onChange={(rotate) =>
                    selectedSticker ? updateSticker(selectedSticker.id, { rotate }) : updateText({ rotate })
                  }
                />
                <div className="flex justify-end gap-2">
                  {selectedSticker ? (
                    <button
                      type="button"
                      onClick={removeSelected}
                      className={cn(buttonVariants({ size: "sm", variant: "ghost" }), "gap-1 text-accent-ours")}
                    >
                      <Trash2 aria-hidden />
                      删除贴纸
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setSelectedId(null)}
                    className={buttonVariants({ size: "sm", variant: "outline" })}
                  >
                    完成
                  </button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <label
            htmlFor={inputId}
            className="relative mt-4 grid aspect-square w-full cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed border-line bg-paper"
          >
            <span className="flex flex-col items-center gap-2 text-muted-ours">
              <ImagePlus className="size-8" aria-hidden />
              <span className="text-sm">{preparing ? "正在读取照片…" : "选一张照片"}</span>
            </span>
          </label>
        )}
        {!isEdit ? (
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
        ) : null}

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

        {hasPhoto ? (
          <div className="mt-2">
            <div role="tablist" aria-label="装饰" className="flex gap-1 rounded-full bg-paper p-1">
              {(
                [
                  ["template", "模板"],
                  ["sticker", "贴纸"],
                  ["text", "文字"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={tool === value}
                  onClick={() => setTool(value)}
                  className={cn(
                    "flex-1 rounded-full py-1.5 text-sm transition-colors",
                    tool === value ? "bg-background text-ink shadow-sm" : "text-muted-ours hover:text-ink",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {tool === "template" ? (
              <div className="-mx-5 mt-3 flex gap-3 overflow-x-auto px-5 pb-2">
                {MOMENT_TEMPLATES.map((template) => (
                  <button
                    key={template}
                    type="button"
                    onClick={() => {
                      setLayout((current) => withTemplate(current, template));
                      setSelectedId(null);
                    }}
                    aria-pressed={layout.template === template}
                    className="w-[84px] shrink-0 text-center"
                  >
                    <span
                      className={cn(
                        "block overflow-hidden rounded-lg ring-2 transition-shadow",
                        layout.template === template ? "ring-gold" : "ring-transparent",
                      )}
                    >
                      <MomentCard
                        photoUrl={photoUrl}
                        caption={caption || "一句话"}
                        takenOn={takenOn}
                        layout={withTemplate({ ...layout, stickers: [] }, template)}
                      />
                    </span>
                    <span className="mt-1 block text-xs text-muted-ours">{TEMPLATE_LABELS[template]}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {tool === "sticker" ? (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-6 gap-1.5">
                  {DECO_STICKERS.map((deco) => (
                    <button
                      key={deco}
                      type="button"
                      title={DECO_LABELS[deco]}
                      aria-label={`添加${DECO_LABELS[deco]}`}
                      onClick={() => addSticker({ kind: "deco", value: deco })}
                      className="grid aspect-square place-items-center rounded-lg bg-paper p-1.5 hover:bg-line/60"
                    >
                      <span className="block w-full">
                        <DecoArt value={deco} takenOn={takenOn} />
                      </span>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-8 gap-1">
                  {EMOJI_STICKERS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      aria-label={`添加 ${emoji}`}
                      onClick={() => addSticker({ kind: "emoji", value: emoji })}
                      className="grid aspect-square place-items-center rounded-lg text-2xl hover:bg-paper"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    value={customEmoji}
                    onChange={(event) => setCustomEmoji(event.target.value)}
                    maxLength={16}
                    placeholder="其他 emoji，例如 🦄"
                    aria-label="自定义 emoji"
                    className="min-w-0 flex-1 rounded-lg border border-line bg-background px-3 py-1.5 text-sm text-ink outline-none focus:border-gold"
                  />
                  <button
                    type="button"
                    disabled={!customEmoji.trim()}
                    onClick={() => {
                      addSticker({ kind: "emoji", value: customEmoji.trim() });
                      setCustomEmoji("");
                    }}
                    className={buttonVariants({ size: "sm", variant: "outline" })}
                  >
                    加上
                  </button>
                </div>
                <p className="text-xs text-muted-ours">
                  点一下贴纸就会加到照片上，再拖动、调大小或旋转。（{layout.stickers.length}/{MAX_STICKERS}）
                </p>
              </div>
            ) : null}

            {tool === "text" ? (
              <div className="mt-3 space-y-3">
                <div className="rounded-xl bg-paper px-4 py-2">
                  <RangeRow
                    label="字号"
                    min={TEXT_SCALE_MIN}
                    max={TEXT_SCALE_MAX}
                    step={0.05}
                    value={textScaleOf(layout)}
                    onChange={(textScale) => setLayout((current) => ({ ...current, textScale }))}
                    suffix={`${Math.round(textScaleOf(layout) * 100)}%`}
                  />
                </div>
                {canFloatText && floatingText ? (
                  <>
                    <p className="text-xs text-muted-ours">拖动照片上的文字来摆位置；选中文字后可以旋转。</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(layout.template === "magazine"
                        ? (["clear", "dark"] as MomentTextStyle[])
                        : TEXT_STYLES
                      ).map((style) => (
                        <button
                          key={style}
                          type="button"
                          aria-pressed={floatingText.style === style}
                          onClick={() => updateText({ style })}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs transition-colors",
                            floatingText.style === style
                              ? "border-gold bg-gold/15 text-ink"
                              : "border-line text-muted-ours hover:text-ink",
                          )}
                        >
                          {layout.template === "magazine"
                            ? style === "clear"
                              ? "白字"
                              : "黑字"
                            : TEXT_STYLE_LABELS[style]}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl bg-paper px-4 py-3 text-xs leading-6 text-muted-ours">
                    「{TEMPLATE_LABELS[layout.template]}」的文字在固定位置。想把字放在照片上随意摆，换成
                    <button type="button" className="mx-1 text-ink underline underline-offset-4" onClick={() => setLayout((current) => withTemplate(current, "overlay"))}>
                      文字贴图
                    </button>
                    或
                    <button type="button" className="mx-1 text-ink underline underline-offset-4" onClick={() => setLayout((current) => withTemplate(current, "magazine"))}>
                      杂志大字
                    </button>
                    。
                  </div>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
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
          disabled={busy || preparing || !hasPhoto || !caption.trim() || !takenOn}
          className={cn(buttonVariants({ size: "lg" }), "mt-5 w-full")}
        >
          {busy ? (isEdit ? "保存中…" : "发布中…（上传原图需要一点时间）") : isEdit ? "保存" : "发布"}
        </button>
      </form>
    </div>,
    document.body,
  );
}

function RangeRow({
  label,
  min,
  max,
  step,
  value,
  onChange,
  suffix,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
}) {
  return (
    <label className="flex items-center gap-3 text-xs text-muted-ours">
      <span className="w-8 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="flex-1 accent-[#b8955a]"
      />
      {suffix ? <span className="w-10 shrink-0 text-right tabular-nums">{suffix}</span> : null}
    </label>
  );
}
