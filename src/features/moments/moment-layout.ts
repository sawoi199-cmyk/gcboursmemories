import { z } from "zod";

/**
 * How a moment is decorated. Everything here is plain data rendered over the
 * photo by MomentCard — the original image is never modified.
 * Coordinates are fractions (0–1) of the 4:5 card box, sticker centre / text centre.
 */

export const MOMENT_TEMPLATES = ["simple", "overlay", "polaroid", "film", "note", "magazine"] as const;
export type MomentTemplate = (typeof MOMENT_TEMPLATES)[number];

export const TEMPLATE_LABELS: Record<MomentTemplate, string> = {
  simple: "简约",
  overlay: "文字贴图",
  polaroid: "拍立得",
  film: "胶片",
  note: "便利贴",
  magazine: "杂志大字",
};

/** Templates whose caption sits on the photo and can be dragged. */
export const FLOATING_TEXT_TEMPLATES: readonly MomentTemplate[] = ["overlay", "magazine"];

export const TEXT_STYLES = ["cream", "white", "dark", "pink", "clear"] as const;
export type MomentTextStyle = (typeof TEXT_STYLES)[number];

export const TEXT_STYLE_LABELS: Record<MomentTextStyle, string> = {
  cream: "奶油",
  white: "白底",
  dark: "黑底",
  pink: "粉色",
  clear: "无底",
};

export const DECO_STICKERS = [
  "tape-pink",
  "tape-blue",
  "tape-yellow",
  "heart",
  "star",
  "sparkle",
  "flower",
  "cloud",
  "smile",
  "arrow",
  "love-stamp",
  "date-stamp",
] as const;
export type DecoSticker = (typeof DECO_STICKERS)[number];

export const EMOJI_STICKERS = [
  "❤️", "💕", "🥰", "😘", "😂", "🥹", "😭", "🤪", "😴", "🫶",
  "✨", "🌸", "🌈", "☀️", "🌙", "⭐", "🔥", "🍀", "🎉", "🎂",
  "🍰", "🍜", "☕", "🍷", "🐼", "🐱", "🐶", "🌊", "🏖️", "🎬",
  "🎮", "📷", "✈️", "🚗", "🚂", "💍", "🎵", "👍", "🙌", "💯",
] as const;

export const MAX_STICKERS = 24;
export const STICKER_SCALE_MIN = 0.4;
export const STICKER_SCALE_MAX = 2.5;

const Fraction = z.number().min(0).max(1);
const Rotation = z.number().min(-180).max(180);

export const MomentStickerSchema = z.discriminatedUnion("kind", [
  z.object({
    id: z.string().min(1).max(40),
    kind: z.literal("emoji"),
    // A single emoji can be several code points (ZWJ sequences, skin tones).
    value: z.string().trim().min(1).max(16),
    x: Fraction,
    y: Fraction,
    scale: z.number().min(STICKER_SCALE_MIN).max(STICKER_SCALE_MAX),
    rotate: Rotation,
  }),
  z.object({
    id: z.string().min(1).max(40),
    kind: z.literal("deco"),
    value: z.enum(DECO_STICKERS),
    x: Fraction,
    y: Fraction,
    scale: z.number().min(STICKER_SCALE_MIN).max(STICKER_SCALE_MAX),
    rotate: Rotation,
  }),
]);
export type MomentSticker = z.infer<typeof MomentStickerSchema>;

export const MomentTextSchema = z.object({
  x: Fraction,
  y: Fraction,
  rotate: Rotation,
  style: z.enum(TEXT_STYLES),
});
export type MomentText = z.infer<typeof MomentTextSchema>;

export const MomentLayoutSchema = z.object({
  template: z.enum(MOMENT_TEMPLATES),
  /** Position/style of the caption for floating-text templates; ignored by the others. */
  text: MomentTextSchema.optional(),
  stickers: z.array(MomentStickerSchema).max(MAX_STICKERS),
});
export type MomentLayout = z.infer<typeof MomentLayoutSchema>;

export const DEFAULT_TEXT: Record<"overlay" | "magazine", MomentText> = {
  overlay: { x: 0.5, y: 0.78, rotate: -2, style: "cream" },
  magazine: { x: 0.5, y: 0.8, rotate: 0, style: "clear" },
};

export function defaultLayout(): MomentLayout {
  return { template: "simple", stickers: [] };
}

/** Text placement for a floating-text template, falling back to its default. */
export function textFor(layout: MomentLayout): MomentText | null {
  if (layout.template === "overlay" || layout.template === "magazine") {
    return layout.text ?? DEFAULT_TEXT[layout.template];
  }
  return null;
}

/** Tolerant read of a stored layout: anything malformed renders as the default. */
export function parseMomentLayout(value: unknown): MomentLayout {
  const parsed = MomentLayoutSchema.safeParse(value);
  return parsed.success ? parsed.data : defaultLayout();
}

/** Strict parse for the multipart `layout` field (a JSON string). */
export const LayoutJsonSchema = z
  .string()
  .max(20_000)
  .transform((raw, ctx) => {
    try {
      return JSON.parse(raw) as unknown;
    } catch {
      ctx.addIssue({ code: "custom", message: "layout must be JSON" });
      return z.NEVER;
    }
  })
  .pipe(MomentLayoutSchema);

export function clampFraction(value: number) {
  return Math.min(1, Math.max(0, value));
}
