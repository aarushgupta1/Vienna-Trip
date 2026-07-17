-- Run this in your Supabase project's SQL Editor

create table if not exists attractions (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  category     text not null default 'other'
               check (category in ('museum', 'food', 'landmark', 'entertainment', 'other')),
  scheduled_date date,
  start_time   time,
  end_time     time,
  notes        text,
  location     text,
  lat          double precision,
  lng          double precision,
  created_at   timestamptz default now()
);

-- Safe to re-run on an existing table: adds the location/travel-time columns
-- (geocoded from the "location" address text) if they aren't there yet.
alter table attractions add column if not exists location text;
alter table attractions add column if not exists lat double precision;
alter table attractions add column if not exists lng double precision;

-- Uploaded ticket files (images/PDFs), stored as public URLs into the
-- "tickets" storage bucket set up below.
alter table attractions add column if not exists ticket_urls text[] not null default '{}';

-- Whether someone has checked this event off. Shared across everyone (no
-- per-user state) so one family member checking/unchecking an event is
-- immediately reflected for everyone else via the realtime subscription
-- already set up below for this table.
alter table attractions add column if not exists is_checked boolean not null default false;

-- Enable Row Level Security
alter table attractions enable row level security;

-- Allow full public access (no auth — shared family app)
create policy "public_select" on attractions for select using (true);
create policy "public_insert" on attractions for insert with check (true);
create policy "public_update" on attractions for update using (true);
create policy "public_delete" on attractions for delete using (true);

-- Enable Realtime (run once; also toggle the table on in the Supabase dashboard → Database → Replication)
alter table attractions replica identity full;
alter publication supabase_realtime add table attractions;

-- Storage bucket for uploaded ticket files (images/PDFs), public read like
-- the rest of this no-auth family app.
insert into storage.buckets (id, name, public)
values ('tickets', 'tickets', true)
on conflict (id) do nothing;

create policy "public_read_tickets" on storage.objects for select using (bucket_id = 'tickets');
create policy "public_insert_tickets" on storage.objects for insert with check (bucket_id = 'tickets');
create policy "public_delete_tickets" on storage.objects for delete using (bucket_id = 'tickets');

-- Logistics pinboard. Already referenced by the app; included here so a
-- fresh setup has it. If you already have this table, just run the
-- "Enable Realtime" lines below for it.
create table if not exists logistics_pins (
  id         uuid primary key default gen_random_uuid(),
  category   text not null default 'other'
             check (category in ('flights', 'accommodation', 'transport', 'documents', 'contacts', 'budget', 'other')),
  title      text not null,
  content    text not null default '',
  created_at timestamptz default now()
);

alter table logistics_pins enable row level security;

create policy "public_select" on logistics_pins for select using (true);
create policy "public_insert" on logistics_pins for insert with check (true);
create policy "public_update" on logistics_pins for update using (true);
create policy "public_delete" on logistics_pins for delete using (true);

-- Enable Realtime (run once; also toggle the table on in the Supabase dashboard → Database → Replication)
alter table logistics_pins replica identity full;
alter publication supabase_realtime add table logistics_pins;

-- Per-day notes on the calendar (previously localStorage-only, so they
-- didn't sync across devices).
create table if not exists day_notes (
  date       date primary key,
  note       text not null default '',
  updated_at timestamptz default now()
);

alter table day_notes enable row level security;

create policy "public_select" on day_notes for select using (true);
create policy "public_insert" on day_notes for insert with check (true);
create policy "public_update" on day_notes for update using (true);
create policy "public_delete" on day_notes for delete using (true);

-- Enable Realtime (run once; also toggle the table on in the Supabase dashboard → Database → Replication)
alter table day_notes replica identity full;
alter publication supabase_realtime add table day_notes;
