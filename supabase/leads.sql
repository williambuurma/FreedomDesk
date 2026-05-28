-- FreedomDesk lead capture table
-- Run in Supabase SQL editor

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  practice_name text not null,
  email text not null,
  phone text not null,
  practice_software text not null,
  locations text not null,
  call_volume text not null,
  source text default 'website',
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists leads_email_idx on public.leads (email);
create index if not exists leads_submitted_at_idx on public.leads (submitted_at desc);

-- Service role key bypasses RLS; enable RLS if using anon key instead
alter table public.leads enable row level security;
