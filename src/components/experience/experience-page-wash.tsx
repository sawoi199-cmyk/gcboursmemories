import { cn } from "@/lib/utils";
import type { PeriodPageTheme } from "@/lib/atmosphere/day-period";

type ExperiencePageWashProps = {
  theme: PeriodPageTheme;
  className?: string;
};

/** Soft timed wash for reading pages — pairs with home atmosphere without photo noise. */
export function ExperiencePageWash({ theme, className }: ExperiencePageWashProps) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <div
        className="absolute inset-0 transition-colors duration-700"
        style={{ backgroundColor: theme.page }}
      />

      {/* Soft sky-side light — bridges from home photo mood */}
      <div
        className="absolute inset-x-0 top-0 h-56 transition-opacity duration-700"
        style={{
          backgroundImage: `radial-gradient(ellipse 90% 80% at 18% -10%, ${theme.washA}, transparent 60%), radial-gradient(ellipse 70% 70% at 92% 0%, ${theme.washB}, transparent 55%)`,
        }}
      />

      {/* Quiet bottom vignette so lists feel grounded */}
      <div
        className="absolute inset-x-0 bottom-0 h-48"
        style={{
          backgroundImage: `linear-gradient(to top, ${theme.rim}, transparent)`,
        }}
      />

      {/* Fine paper grain */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-multiply"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Very light ruled texture — letter-like, not loud */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 27px, ${theme.line} 28px)`,
        }}
      />
    </div>
  );
}
