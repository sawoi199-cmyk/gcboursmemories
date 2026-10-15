-- Shared wish list: things the two of us want to do together.
-- Written from the experience pages (shared site password), so `author`
-- records who made the wish instead of relying on a login identity.

create table if not exists public.wishes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  note text check (note is null or char_length(note) <= 300),
  author text not null check (author in ('owner', 'partner')),
  status text not null default 'wish' check (status in ('wish', 'done')),
  done_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wishes_done_on_matches_status check ((status = 'done') = (done_on is not null))
);

create index if not exists wishes_owner_status_idx
  on public.wishes (owner_id, status, created_at desc);

drop trigger if exists wishes_set_updated_at on public.wishes;
create trigger wishes_set_updated_at
  before update on public.wishes
  for each row execute function public.set_updated_at();

alter table public.wishes enable row level security;

create policy "wishes_owner_all"
  on public.wishes for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
