-- Moments (流光): one photo + one sentence, posted straight from the experience pages.
-- Photos reuse the existing pipeline (original on Drive, thumbnail in memory-thumbnails).

create table if not exists public.moments (
  id uuid primary key default gen_random_uuid(),
  -- Monotonic posting order; tie-breaker for moments on the same day and pagination cursor.
  seq bigint generated always as identity,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  -- restrict: photo cleanup must delete the moment first (see hard-delete-photos).
  photo_id uuid not null unique references public.photos (id) on delete restrict,
  caption text not null check (char_length(caption) between 1 and 140),
  taken_on date not null,
  author text not null check (author in ('owner', 'partner')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists moments_seq_uidx on public.moments (seq);
create index if not exists moments_owner_feed_idx
  on public.moments (owner_id, taken_on desc, seq desc);

drop trigger if exists moments_set_updated_at on public.moments;
create trigger moments_set_updated_at
  before update on public.moments
  for each row execute function public.set_updated_at();

alter table public.moments enable row level security;

create policy "moments_owner_all"
  on public.moments for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- A fulfilled wish can point at the moment that remembers it (one moment per wish).
alter table public.wishes
  add column if not exists moment_id uuid references public.moments (id) on delete set null;

create unique index if not exists wishes_moment_id_uidx
  on public.wishes (moment_id)
  where moment_id is not null;
