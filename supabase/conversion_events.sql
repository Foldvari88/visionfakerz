create table if not exists public.conversion_events (
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

create index if not exists conversion_events_event_name_idx
on public.conversion_events (event_name);

create index if not exists conversion_events_track_title_idx
on public.conversion_events (track_title);

create index if not exists conversion_events_occurred_at_idx
on public.conversion_events (occurred_at desc);

alter table public.conversion_events enable row level security;

create policy "server writes conversion events"
on public.conversion_events
for insert
to anon, authenticated, service_role
with check (true);
