-- Esmalta CRM backend v1: clients + appointments with sync support.
-- Apply in Supabase SQL editor.

create table if not exists public.esmalta_clients (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  local_id text,
  name text not null,
  phone text not null default '',
  last_procedure text,
  last_visit date,
  next_due date,
  visits integer not null default 0,
  spent numeric not null default 0,
  is_deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(owner_id, local_id)
);

create table if not exists public.esmalta_appointments (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  local_id text,
  client_name text not null,
  phone text not null default '',
  date date not null,
  time text not null,
  procedure text not null,
  status text not null default 'scheduled'
    check (status in ('scheduled','confirmed','done','cancelled','missed')),
  is_deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(owner_id, local_id)
);

alter table public.esmalta_clients enable row level security;
alter table public.esmalta_appointments enable row level security;

drop policy if exists "owner_all" on public.esmalta_clients;
create policy "owner_all" on public.esmalta_clients
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "owner_all" on public.esmalta_appointments;
create policy "owner_all" on public.esmalta_appointments
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create index if not exists esmalta_clients_owner_idx
  on public.esmalta_clients(owner_id, updated_at desc);
create index if not exists esmalta_appointments_owner_idx
  on public.esmalta_appointments(owner_id, date desc);
