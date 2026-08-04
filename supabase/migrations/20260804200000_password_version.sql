alter table public.relationship_settings
  add column if not exists password_version integer not null default 0;
