create table if not exists public.email_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'visionfakerz_landing',
  page_path text,
  referrer text,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.email_subscribers enable row level security;

create policy "email signup insert"
on public.email_subscribers
for insert
to anon
with check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

create policy "email signup update duplicate"
on public.email_subscribers
for update
to anon
using (true)
with check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

create or replace function public.set_email_subscribers_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists email_subscribers_updated_at on public.email_subscribers;
create trigger email_subscribers_updated_at
before update on public.email_subscribers
for each row
execute function public.set_email_subscribers_updated_at();
