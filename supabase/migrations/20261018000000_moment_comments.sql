-- Comments and likes on moments. Written from the experience pages (shared site
-- password), so `author` records who wrote / liked instead of a login identity.
-- Both cascade away with their moment.

create table if not exists public.moment_comments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  moment_id uuid not null references public.moments (id) on delete cascade,
  author text not null check (author in ('owner', 'partner')),
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);

create index if not exists moment_comments_moment_idx
  on public.moment_comments (moment_id, created_at);

alter table public.moment_comments enable row level security;

create policy "moment_comments_owner_all"
  on public.moment_comments for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create table if not exists public.moment_likes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  moment_id uuid not null references public.moments (id) on delete cascade,
  author text not null check (author in ('owner', 'partner')),
  created_at timestamptz not null default now(),
  -- Each of the two of us can like a moment once.
  unique (moment_id, author)
);

alter table public.moment_likes enable row level security;

create policy "moment_likes_owner_all"
  on public.moment_likes for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
