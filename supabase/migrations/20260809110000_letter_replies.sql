-- Allow one private reply for each published letter in the shared archive.

create table if not exists public.letter_replies (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  letter_id uuid not null references public.letters (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (letter_id)
);

create index if not exists letter_replies_owner_id_idx
  on public.letter_replies (owner_id);

drop trigger if exists letter_replies_set_updated_at on public.letter_replies;
create trigger letter_replies_set_updated_at
  before update on public.letter_replies
  for each row execute function public.set_updated_at();

alter table public.letter_replies enable row level security;

create policy "letter_replies_owner_all"
  on public.letter_replies for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
