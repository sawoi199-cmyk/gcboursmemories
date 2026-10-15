import type { DecoSticker } from "@/features/moments/moment-layout";

/** Hand-drawn decoration stickers (original artwork, no external images). */

type DecoProps = { takenOn: string };

function Tape({ fill, stripe }: { fill: string; stripe: string }) {
  return (
    <svg viewBox="0 0 120 32" width="100%" height="100%" aria-hidden>
      <defs>
        <pattern id={`tape-${fill.slice(1)}`} width="10" height="32" patternUnits="userSpaceOnUse">
          <rect width="10" height="32" fill={fill} />
          <rect width="4" height="32" fill={stripe} />
        </pattern>
      </defs>
      <path
        d="M3 4 L8 2 L13 5 L117 3 L114 9 L118 15 L115 21 L118 28 L112 30 L6 29 L2 23 L5 17 L1 11 Z"
        fill={`url(#tape-${fill.slice(1)})`}
        opacity="0.82"
      />
    </svg>
  );
}

const ink = "#5b4636";

const DECOS: Record<DecoSticker, (props: DecoProps) => React.ReactElement> = {
  "tape-pink": () => <Tape fill="#f6c6d4" stripe="#f9d8e2" />,
  "tape-blue": () => <Tape fill="#bcd8f0" stripe="#d2e5f5" />,
  "tape-yellow": () => <Tape fill="#f7dd8f" stripe="#fae8b0" />,
  heart: () => (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
      <path
        d="M32 54 C14 42 6 32 8 21 C10 12 21 8 28 15 C30 17 31 19 32 21 C33 19 34 17 36 15 C43 8 54 12 56 21 C58 32 50 42 32 54 Z"
        fill="#ef8fae"
        stroke="#c4466f"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M17 22 C18 18 21 16 24 16" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.8" />
    </svg>
  ),
  star: () => (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
      <path
        d="M32 6 L39 23 L57 24 L43 36 L48 54 L32 44 L16 54 L21 36 L7 24 L25 23 Z"
        fill="#f7d16a"
        stroke="#b98a12"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  ),
  sparkle: () => (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
      <path d="M26 6 C28 20 30 24 44 26 C30 28 28 32 26 46 C24 32 22 28 8 26 C22 24 24 20 26 6 Z" fill="#fff4c2" stroke="#d6a52b" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M48 36 C49 43 50 45 57 46 C50 47 49 49 48 56 C47 49 46 47 39 46 C46 45 47 43 48 36 Z" fill="#fff4c2" stroke="#d6a52b" strokeWidth="2" strokeLinejoin="round" />
    </svg>
  ),
  flower: () => (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
      {[0, 72, 144, 216, 288].map((angle) => (
        <ellipse
          key={angle}
          cx="32"
          cy="17"
          rx="9"
          ry="13"
          fill="#f9c3cf"
          stroke="#d9738b"
          strokeWidth="2.5"
          transform={`rotate(${angle} 32 32)`}
        />
      ))}
      <circle cx="32" cy="32" r="7" fill="#f7d16a" stroke="#c99a1e" strokeWidth="2.5" />
    </svg>
  ),
  cloud: () => (
    <svg viewBox="0 0 80 52" width="100%" height="100%" aria-hidden>
      <path
        d="M20 44 C9 44 5 35 10 29 C7 20 16 13 24 17 C27 8 42 6 47 15 C55 10 66 15 65 24 C74 25 76 38 68 42 C66 44 63 44 60 44 Z"
        fill="#ffffff"
        stroke="#8fb6d8"
        strokeWidth="3"
        strokeLinejoin="round"
      />
    </svg>
  ),
  smile: () => (
    <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
      <circle cx="32" cy="32" r="25" fill="#ffe27a" stroke={ink} strokeWidth="3" />
      <circle cx="23" cy="27" r="3.2" fill={ink} />
      <circle cx="41" cy="27" r="3.2" fill={ink} />
      <path d="M20 37 C25 46 39 46 44 37" stroke={ink} strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="17" cy="37" r="4" fill="#f5a3b5" opacity="0.7" />
      <circle cx="47" cy="37" r="4" fill="#f5a3b5" opacity="0.7" />
    </svg>
  ),
  arrow: () => (
    <svg viewBox="0 0 80 40" width="100%" height="100%" aria-hidden>
      <path d="M6 30 C24 8 46 6 68 18" stroke={ink} strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d="M58 9 L70 18 L57 25" stroke={ink} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  ),
  "love-stamp": () => (
    <svg viewBox="0 0 80 80" width="100%" height="100%" aria-hidden>
      <circle cx="40" cy="40" r="34" fill="none" stroke="#c4466f" strokeWidth="3" strokeDasharray="4 3" />
      <circle cx="40" cy="40" r="27" fill="none" stroke="#c4466f" strokeWidth="2" />
      <text x="40" y="47" textAnchor="middle" fontSize="18" fontFamily="Georgia, serif" fontWeight="700" fill="#c4466f" letterSpacing="2">
        LOVE
      </text>
    </svg>
  ),
  "date-stamp": ({ takenOn }) => (
    <svg viewBox="0 0 120 44" width="100%" height="100%" aria-hidden>
      <rect x="3" y="3" width="114" height="38" rx="5" fill="none" stroke="#b5482f" strokeWidth="3" />
      <text x="60" y="29" textAnchor="middle" fontSize="18" fontFamily="'Courier New', monospace" fontWeight="700" fill="#b5482f" letterSpacing="1">
        {takenOn.replaceAll("-", ".")}
      </text>
    </svg>
  ),
};

/** Base width of each deco as a fraction of the card width, before user scaling. */
export const DECO_WIDTH: Record<DecoSticker, number> = {
  "tape-pink": 0.34,
  "tape-blue": 0.34,
  "tape-yellow": 0.34,
  heart: 0.16,
  star: 0.15,
  sparkle: 0.15,
  flower: 0.16,
  cloud: 0.2,
  smile: 0.15,
  arrow: 0.2,
  "love-stamp": 0.2,
  "date-stamp": 0.3,
};

/** Height / width ratio of each deco's artwork. */
export const DECO_RATIO: Record<DecoSticker, number> = {
  "tape-pink": 32 / 120,
  "tape-blue": 32 / 120,
  "tape-yellow": 32 / 120,
  heart: 1,
  star: 1,
  sparkle: 1,
  flower: 1,
  cloud: 52 / 80,
  smile: 1,
  arrow: 40 / 80,
  "love-stamp": 1,
  "date-stamp": 44 / 120,
};

export const DECO_LABELS: Record<DecoSticker, string> = {
  "tape-pink": "粉色胶带",
  "tape-blue": "蓝色胶带",
  "tape-yellow": "黄色胶带",
  heart: "爱心",
  star: "星星",
  sparkle: "闪光",
  flower: "小花",
  cloud: "云朵",
  smile: "笑脸",
  arrow: "箭头",
  "love-stamp": "LOVE 印章",
  "date-stamp": "日期章",
};

export function DecoArt({ value, takenOn }: { value: DecoSticker; takenOn: string }) {
  const Art = DECOS[value];
  return <Art takenOn={takenOn} />;
}
