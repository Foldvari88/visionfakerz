create extension if not exists pgcrypto;

create table if not exists public.conversions (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  spotify_action text,
  spotify_label text,
  spotify_target text,
  track_title text,
  page_path text,
  referrer text,
  device text,
  user_agent text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists conversions_event_name_idx
on public.conversions (event_name);

create index if not exists conversions_track_title_idx
on public.conversions (track_title);

create index if not exists conversions_occurred_at_idx
on public.conversions (occurred_at desc);

alter table public.conversions enable row level security;

grant insert on table public.conversions to anon, authenticated, service_role;

drop policy if exists "server writes conversions" on public.conversions;

create policy "server writes conversions"
on public.conversions
for insert
to anon, authenticated, service_role
with check (true);
