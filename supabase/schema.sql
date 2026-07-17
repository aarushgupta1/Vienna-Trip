-- Run this in your Supabase project's SQL Editor. Safe to re-run in full any
-- time this file changes — every statement is idempotent: tables/columns use
-- IF NOT EXISTS, policies are dropped before being recreated (Postgres has
-- no CREATE POLICY IF NOT EXISTS), and adding a table to the realtime
-- publication is wrapped to ignore "already a member" errors (no ADD TABLE
-- IF NOT EXISTS for publications either).

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

-- The per-event checkmark feature was removed — drops the column from any
-- database that still has it from before. Safe to re-run either way.
alter table attractions drop column if exists is_checked;

-- Enable Row Level Security
alter table attractions enable row level security;

-- Allow full public access (no auth — shared family app)
drop policy if exists "public_select" on attractions;
drop policy if exists "public_insert" on attractions;
drop policy if exists "public_update" on attractions;
drop policy if exists "public_delete" on attractions;
create policy "public_select" on attractions for select using (true);
create policy "public_insert" on attractions for insert with check (true);
create policy "public_update" on attractions for update using (true);
create policy "public_delete" on attractions for delete using (true);

-- Enable Realtime (run once; also toggle the table on in the Supabase dashboard → Database → Replication)
alter table attractions replica identity full;
do $$ begin
  alter publication supabase_realtime add table attractions;
exception when duplicate_object then null; -- already added — fine on a re-run
end $$;

-- Storage bucket for uploaded ticket files (images/PDFs), public read like
-- the rest of this no-auth family app.
insert into storage.buckets (id, name, public)
values ('tickets', 'tickets', true)
on conflict (id) do nothing;

drop policy if exists "public_read_tickets" on storage.objects;
drop policy if exists "public_insert_tickets" on storage.objects;
drop policy if exists "public_delete_tickets" on storage.objects;
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

drop policy if exists "public_select" on logistics_pins;
drop policy if exists "public_insert" on logistics_pins;
drop policy if exists "public_update" on logistics_pins;
drop policy if exists "public_delete" on logistics_pins;
create policy "public_select" on logistics_pins for select using (true);
create policy "public_insert" on logistics_pins for insert with check (true);
create policy "public_update" on logistics_pins for update using (true);
create policy "public_delete" on logistics_pins for delete using (true);

-- Enable Realtime (run once; also toggle the table on in the Supabase dashboard → Database → Replication)
alter table logistics_pins replica identity full;
do $$ begin
  alter publication supabase_realtime add table logistics_pins;
exception when duplicate_object then null; -- already added — fine on a re-run
end $$;

-- Per-day notes on the calendar (previously localStorage-only, so they
-- didn't sync across devices).
create table if not exists day_notes (
  date       date primary key,
  note       text not null default '',
  updated_at timestamptz default now()
);

alter table day_notes enable row level security;

drop policy if exists "public_select" on day_notes;
drop policy if exists "public_insert" on day_notes;
drop policy if exists "public_update" on day_notes;
drop policy if exists "public_delete" on day_notes;
create policy "public_select" on day_notes for select using (true);
create policy "public_insert" on day_notes for insert with check (true);
create policy "public_update" on day_notes for update using (true);
create policy "public_delete" on day_notes for delete using (true);

-- Enable Realtime (run once; also toggle the table on in the Supabase dashboard → Database → Replication)
alter table day_notes replica identity full;
do $$ begin
  alter publication supabase_realtime add table day_notes;
exception when duplicate_object then null; -- already added — fine on a re-run
end $$;

-- Event reminders (Web Push). Each device that enables notifications stores
-- one subscription here; the /api/send-event-reminders endpoint (triggered
-- by a cron job — see supabase/reminders_cron.sql) reads all of them and
-- pushes a "starts in 30 min" notification to every device at once. No
-- realtime needed — these tables are only ever read/written server-side or
-- written once by the subscribing device itself.
create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz default now()
);

alter table push_subscriptions enable row level security;

drop policy if exists "public_select" on push_subscriptions;
drop policy if exists "public_insert" on push_subscriptions;
drop policy if exists "public_update" on push_subscriptions;
drop policy if exists "public_delete" on push_subscriptions;
create policy "public_select" on push_subscriptions for select using (true);
create policy "public_insert" on push_subscriptions for insert with check (true);
create policy "public_update" on push_subscriptions for update using (true);
create policy "public_delete" on push_subscriptions for delete using (true);

-- Tracks which attractions have already had their 30-minutes-prior reminder
-- sent, so repeated cron runs don't re-notify. Deleted automatically if the
-- attraction is deleted; the app also clears a row here whenever that
-- attraction's day/time changes, so a rescheduled event gets a fresh reminder.
create table if not exists event_reminders_sent (
  attraction_id uuid primary key references attractions(id) on delete cascade,
  sent_at       timestamptz default now()
);

alter table event_reminders_sent enable row level security;

drop policy if exists "public_select" on event_reminders_sent;
drop policy if exists "public_insert" on event_reminders_sent;
drop policy if exists "public_delete" on event_reminders_sent;
create policy "public_select" on event_reminders_sent for select using (true);
create policy "public_insert" on event_reminders_sent for insert with check (true);
create policy "public_delete" on event_reminders_sent for delete using (true);
