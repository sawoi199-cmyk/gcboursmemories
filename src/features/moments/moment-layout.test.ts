import { describe, expect, it } from "vitest";
import {
  DEFAULT_TEXT,
  LayoutJsonSchema,
  MAX_STICKERS,
  MomentLayoutSchema,
  parseMomentLayout,
  textFor,
  textScaleOf,
} from "@/features/moments/moment-layout";

const sticker = {
  id: "s1",
  kind: "emoji" as const,
  value: "❤️",
  x: 0.5,
  y: 0.4,
  scale: 1,
  rotate: -10,
};

describe("MomentLayoutSchema", () => {
  it("accepts every template with emoji and deco stickers", () => {
    const layout = {
      template: "overlay",
      text: { x: 0.5, y: 0.8, rotate: -2, style: "pink" },
      stickers: [sticker, { ...sticker, id: "s2", kind: "deco", value: "tape-pink" }],
    };
    expect(MomentLayoutSchema.safeParse(layout).success).toBe(true);
  });

  it("rejects unknown templates, decos, out-of-card positions and too many stickers", () => {
    expect(MomentLayoutSchema.safeParse({ template: "comic", stickers: [] }).success).toBe(false);
    expect(
      MomentLayoutSchema.safeParse({
        template: "simple",
        stickers: [{ ...sticker, kind: "deco", value: "skull" }],
      }).success,
    ).toBe(false);
    expect(
      MomentLayoutSchema.safeParse({ template: "simple", stickers: [{ ...sticker, x: 1.2 }] })
        .success,
    ).toBe(false);
    expect(
      MomentLayoutSchema.safeParse({
        template: "simple",
        stickers: Array.from({ length: MAX_STICKERS + 1 }, (_, i) => ({ ...sticker, id: `s${i}` })),
      }).success,
    ).toBe(false);
  });
});

describe("textScale", () => {
  it("accepts a caption size multiplier within range and defaults to 1", () => {
    expect(MomentLayoutSchema.safeParse({ template: "simple", textScale: 1.4, stickers: [] }).success).toBe(true);
    expect(MomentLayoutSchema.safeParse({ template: "simple", textScale: 2, stickers: [] }).success).toBe(false);
    expect(MomentLayoutSchema.safeParse({ template: "simple", textScale: 0.5, stickers: [] }).success).toBe(false);
    expect(textScaleOf({ template: "simple", stickers: [] })).toBe(1);
  });
});

describe("parseMomentLayout", () => {
  it("falls back to the simple template for missing or malformed data", () => {
    expect(parseMomentLayout(null)).toEqual({ template: "simple", stickers: [] });
    expect(parseMomentLayout({ template: "polaroid" })).toEqual({ template: "simple", stickers: [] });
  });

  it("keeps a valid stored layout", () => {
    const layout = { template: "film" as const, stickers: [sticker] };
    expect(parseMomentLayout(layout)).toEqual(layout);
  });
});

describe("textFor", () => {
  it("returns the stored or default caption placement only for floating-text templates", () => {
    expect(textFor({ template: "magazine", stickers: [] })).toEqual(DEFAULT_TEXT.magazine);
    expect(textFor({ template: "polaroid", stickers: [] })).toBeNull();
  });
});

describe("LayoutJsonSchema", () => {
  it("parses a JSON string and rejects invalid JSON", () => {
    expect(LayoutJsonSchema.parse(JSON.stringify({ template: "note", stickers: [] }))).toEqual({
      template: "note",
      stickers: [],
    });
    expect(LayoutJsonSchema.safeParse("{not json").success).toBe(false);
  });
});
