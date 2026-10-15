-- Moment decoration: template, caption placement and stickers, stored as data and
-- rendered over the untouched photo (the original is never re-encoded).
-- Shape is validated by MomentLayoutSchema (src/features/moments/moment-layout.ts).

alter table public.moments
  add column if not exists layout jsonb not null default '{"template":"simple","stickers":[]}'::jsonb;

alter table public.moments
  drop constraint if exists moments_layout_is_object;

alter table public.moments
  add constraint moments_layout_is_object check (jsonb_typeof(layout) = 'object');
