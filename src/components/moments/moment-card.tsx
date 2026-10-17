import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { DECO_RATIO, DECO_WIDTH, DecoArt } from "@/components/moments/moment-decos";
import {
  textFor,
  textScaleOf,
  type MomentLayout,
  type MomentSticker,
  type MomentTextStyle,
} from "@/features/moments/moment-layout";
import { cn } from "@/lib/utils";
import { formatDottedDate } from "@/lib/utils/date";

/** Id used for the draggable caption in floating-text templates. */
export const CAPTION_TARGET = "text";

export type MomentCardInteraction = {
  selectedId: string | null;
  onPointerDown: (targetId: string, event: ReactPointerEvent<HTMLElement>) => void;
};

type MomentCardProps = {
  photoUrl: string | null;
  caption: string;
  takenOn: string;
  layout: MomentLayout;
  /** Editor hooks: makes stickers / floating caption draggable and selectable. */
  interaction?: MomentCardInteraction;
  className?: string;
};

// Card typography scales with the card (container query units) and the moment's own
// textScale, but never drops below a readable size on small grid tiles.
function fluidSize(minPx: number, cqw: number, maxPx: number, scale: number) {
  const min = Math.max(10, Math.round(minPx * scale));
  return `clamp(${min}px, ${(cqw * scale).toFixed(2)}cqw, ${Math.round(maxPx * scale)}px)`;
}

function captionSizeFor(scale: number) {
  return fluidSize(11, 5.2, 21, scale);
}
const metaSize = "clamp(10px, 3cqw, 12px)";

const TEXT_STYLE_CLASSES: Record<MomentTextStyle, string> = {
  cream: "bg-[#fbf0dc] text-[#5b3f24]",
  white: "bg-white/92 text-[#2b2522]",
  dark: "bg-[#141211]/70 text-white",
  pink: "bg-[#f9d3df] text-[#7a2946]",
  clear: "bg-transparent text-white [text-shadow:0_0.3cqw_1.4cqw_rgba(0,0,0,0.55)]",
};

function Photo({ url, className, style }: { url: string | null; className?: string; style?: CSSProperties }) {
  return (
    <div
      className={cn("overflow-hidden bg-[linear-gradient(135deg,#e9ddcd,#f6eee4)]", className)}
      style={style}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" draggable={false} className="h-full w-full object-cover select-none" />
      ) : null}
    </div>
  );
}

function Caption({
  caption,
  className,
  style,
  lines,
}: {
  caption: string;
  className?: string;
  style?: CSSProperties;
  lines: number;
}) {
  return (
    <p
      data-moment-caption
      className={cn("break-words whitespace-pre-wrap", !caption && "opacity-45", className)}
      style={{
        display: "-webkit-box",
        WebkitBoxOrient: "vertical",
        WebkitLineClamp: lines,
        overflow: "hidden",
        ...style,
      }}
    >
      {caption || "写一句话…"}
    </p>
  );
}

function interactiveProps(
  interaction: MomentCardInteraction | undefined,
  targetId: string,
): { onPointerDown?: (event: ReactPointerEvent<HTMLElement>) => void; className: string } {
  if (!interaction) return { className: "pointer-events-none" };
  const selected = interaction.selectedId === targetId;
  return {
    onPointerDown: (event) => interaction.onPointerDown(targetId, event),
    className: cn(
      "pointer-events-auto cursor-grab touch-none select-none active:cursor-grabbing",
      selected && "outline-2 outline-offset-2 outline-dashed outline-white [filter:drop-shadow(0_0_1px_rgba(0,0,0,0.6))]",
    ),
  };
}

function StickerView({
  sticker,
  takenOn,
  interaction,
}: {
  sticker: MomentSticker;
  takenOn: string;
  interaction?: MomentCardInteraction;
}) {
  const props = interactiveProps(interaction, sticker.id);
  const transform = `translate(-50%, -50%) rotate(${sticker.rotate}deg) scale(${sticker.scale})`;
  const position: CSSProperties = {
    left: `${sticker.x * 100}%`,
    top: `${sticker.y * 100}%`,
    transform,
  };

  if (sticker.kind === "emoji") {
    return (
      <span
        role={interaction ? "button" : undefined}
        aria-label={interaction ? `贴纸 ${sticker.value}` : undefined}
        onPointerDown={props.onPointerDown}
        className={cn("absolute leading-none", props.className)}
        style={{ ...position, fontSize: "12cqw" }}
      >
        {sticker.value}
      </span>
    );
  }

  const width = DECO_WIDTH[sticker.value] * 100;
  return (
    <div
      role={interaction ? "button" : undefined}
      aria-label={interaction ? "装饰贴纸" : undefined}
      onPointerDown={props.onPointerDown}
      className={cn("absolute", props.className)}
      style={{ ...position, width: `${width}cqw`, height: `${width * DECO_RATIO[sticker.value]}cqw` }}
    >
      <DecoArt value={sticker.value} takenOn={takenOn} />
    </div>
  );
}

function FloatingCaption({
  caption,
  takenOn,
  layout,
  interaction,
}: {
  caption: string;
  takenOn: string;
  layout: MomentLayout;
  interaction?: MomentCardInteraction;
}) {
  const text = textFor(layout);
  if (!text) return null;
  const scale = textScaleOf(layout);
  const props = interactiveProps(interaction, CAPTION_TARGET);
  const position: CSSProperties = {
    left: `${text.x * 100}%`,
    top: `${text.y * 100}%`,
    transform: `translate(-50%, -50%) rotate(${text.rotate}deg)`,
  };

  if (layout.template === "magazine") {
    return (
      <div
        onPointerDown={props.onPointerDown}
        className={cn("absolute w-[84%]", props.className)}
        style={position}
      >
        <Caption
          caption={caption}
          lines={4}
          className={cn(
            "font-serif",
            text.style === "dark" ? "text-[#1f1a17]" : "text-white [text-shadow:0_0.4cqw_1.6cqw_rgba(0,0,0,0.5)]",
          )}
          style={{ fontSize: fluidSize(14, 8.4, 34, scale), lineHeight: 1.15 }}
        />
        <span className="sr-only">{formatDottedDate(takenOn)}</span>
      </div>
    );
  }

  return (
    <div
      onPointerDown={props.onPointerDown}
      // w-max: an absolutely positioned box centred at x would otherwise shrink to the space right of x.
      className={cn("absolute w-max max-w-[82%]", props.className)}
      style={position}
    >
      <Caption
        caption={caption}
        lines={5}
        className={cn("text-center font-serif", TEXT_STYLE_CLASSES[text.style])}
        style={{
          fontSize: captionSizeFor(scale),
          lineHeight: 1.35,
          padding: "1.3cqw 3cqw",
          borderRadius: "1.6cqw",
        }}
      />
    </div>
  );
}

/**
 * A moment as designed: photo + caption + template frame + stickers, in a 4:5 box.
 * Pure rendering — the editor passes `interaction` to make pieces draggable.
 */
export function MomentCard({ photoUrl, caption, takenOn, layout, interaction, className }: MomentCardProps) {
  const date = formatDottedDate(takenOn);
  const captionSize = captionSizeFor(textScaleOf(layout));
  // Ruled-paper spacing of the note template follows the caption size.
  const noteRule = `${(7 * textScaleOf(layout)).toFixed(2)}cqw`;

  return (
    <div
      className={cn("relative aspect-[4/5] w-full overflow-hidden select-none", className)}
      style={{ containerType: "inline-size" }}
    >
      {layout.template === "simple" ? (
        <div className="absolute inset-0 flex flex-col bg-[#fffdf9]">
          <Photo url={photoUrl} className="aspect-square w-full shrink-0" />
          <div className="flex min-h-0 flex-1 flex-col justify-center" style={{ padding: "0 5cqw" }}>
            <Caption caption={caption} lines={2} className="font-serif text-[#2b2522]" style={{ fontSize: captionSize, lineHeight: 1.35 }} />
          </div>
        </div>
      ) : null}

      {layout.template === "polaroid" ? (
        <div className="absolute inset-0 flex flex-col bg-[#fffefb]" style={{ padding: "6cqw 6cqw 0" }}>
          <Photo url={photoUrl} className="aspect-square w-full shrink-0 ring-1 ring-black/5" />
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
            <Caption caption={caption} lines={2} className="font-serif text-[#3a302b]" style={{ fontSize: captionSize, lineHeight: 1.3 }} />
            <p className="mt-[0.8cqw] tracking-wider text-[#a0958c]" style={{ fontSize: metaSize }}>
              {date}
            </p>
          </div>
        </div>
      ) : null}

      {layout.template === "film" ? (
        <div className="absolute inset-0 flex flex-col bg-[#1c1a19]">
          <FilmHoles />
          <div className="relative shrink-0" style={{ margin: "0 5cqw", height: "84cqw" }}>
            <Photo url={photoUrl} className="absolute inset-0" />
            <span
              className="absolute font-mono font-bold text-[#ff8a3d] [text-shadow:0_0_1.2cqw_rgba(255,120,40,0.7)]"
              style={{ right: "3cqw", bottom: "2.5cqw", fontSize: metaSize, letterSpacing: "0.08em" }}
            >
              {date.replaceAll(".", " ").slice(2)}
            </span>
          </div>
          <div className="flex min-h-0 flex-1 items-center" style={{ padding: "0 6cqw" }}>
            <Caption caption={caption} lines={2} className="text-[#efe7da]" style={{ fontSize: captionSize, lineHeight: 1.35 }} />
          </div>
          <FilmHoles />
        </div>
      ) : null}

      {layout.template === "note" ? (
        <div className="absolute inset-0 bg-[#fff1a8]">
          <div
            className="absolute bg-white shadow-[0_1cqw_2.5cqw_rgba(80,60,20,0.25)]"
            style={{ left: "11cqw", top: "9cqw", width: "78cqw", height: "68cqw", padding: "2cqw", transform: "rotate(-2.5deg)" }}
          >
            <Photo url={photoUrl} className="h-full w-full" />
          </div>
          <div className="absolute" style={{ left: "33cqw", top: "4.5cqw", width: "34cqw", height: "9cqw", transform: "rotate(3deg)" }}>
            <DecoArt value="tape-yellow" takenOn={takenOn} />
          </div>
          <div
            className="absolute bg-[repeating-linear-gradient(transparent_0,transparent_calc(var(--rule)-1px),rgba(140,110,40,0.18)_calc(var(--rule)-1px),rgba(140,110,40,0.18)_var(--rule))]"
            style={{ left: "8cqw", right: "8cqw", top: "84cqw", bottom: "5cqw", ["--rule" as string]: noteRule }}
          >
            <Caption caption={caption} lines={3} className="font-serif text-[#4a3b22]" style={{ fontSize: captionSize, lineHeight: noteRule }} />
          </div>
        </div>
      ) : null}

      {layout.template === "overlay" || layout.template === "magazine" ? (
        <div className="absolute inset-0">
          <Photo url={photoUrl} className="absolute inset-0" />
          {layout.template === "magazine" ? (
            <>
              <div className="absolute inset-0 bg-black/10" />
              <p
                className="absolute font-medium tracking-[0.25em] text-white uppercase [text-shadow:0_0_1.2cqw_rgba(0,0,0,0.5)]"
                style={{ left: "6cqw", top: "6cqw", fontSize: metaSize }}
              >
                OURS · {date}
              </p>
            </>
          ) : null}
        </div>
      ) : null}

      <FloatingCaption caption={caption} takenOn={takenOn} layout={layout} interaction={interaction} />

      {/* The layer never takes pointer events itself, so the caption underneath stays draggable. */}
      <div className="pointer-events-none absolute inset-0">
        {layout.stickers.map((sticker) => (
          <StickerView key={sticker.id} sticker={sticker} takenOn={takenOn} interaction={interaction} />
        ))}
      </div>
    </div>
  );
}

function FilmHoles() {
  return (
    <div className="shrink-0" style={{ height: "9cqw", padding: "2.6cqw 0" }}>
      <div
        className="h-full"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent 0 2.2cqw, #e9e1d3 2.2cqw 6cqw, transparent 6cqw 8cqw)",
        }}
      />
    </div>
  );
}
