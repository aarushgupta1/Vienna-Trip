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
               check (category in ('museum', 'food', 'landmark', 'entertainment', 'flights', 'other')),
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

-- "flights" was added as a category — the CREATE TABLE above only applies to
-- a brand-new table, so existing databases need their check constraint
-- widened explicitly to actually accept it.
alter table attractions drop constraint if exists attractions_category_check;
alter table attractions add constraint attractions_category_check
  check (category in ('museum', 'food', 'landmark', 'entertainment', 'flights', 'other'));

-- Uploaded ticket files (images/PDFs), stored as public URLs into the
-- "tickets" storage bucket set up below.
alter table attractions add column if not exists ticket_urls text[] not null default '{}';

-- The per-event checkmark feature was removed — drops the column from any
-- database that still has it from before. Safe to re-run either way.
alter table attractions drop column if exists is_checked;

-- Attribution: the self-chosen display name of whoever last created/edited
-- this row, and when — shown as "last edited by ___" in the edit modal.
-- There's no auth in this app, so this is just a label passed along with
-- each write from the browser's local storage; nothing here is verified.
alter table attractions add column if not exists edited_by text;
alter table attractions add column if not exists updated_at timestamptz default now();

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

-- The logistics pinboard (flights/accommodation/transport/documents/contacts/
-- budget pins) was removed in favor of the calendar's own "flights" category
-- and the dedicated hotels list below — drops the table entirely. Safe to
-- re-run either way.
drop table if exists logistics_pins;

-- Hotels. Multiple stays are supported (e.g. switching hotels partway
-- through the trip) — each is its own row, listed and managed from the
-- sidebar that used to show unscheduled attractions.
create table if not exists hotels (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  location            text,
  lat                 double precision,
  lng                 double precision,
  check_in            date,
  check_out           date,
  price               numeric,
  currency            text not null default 'EUR' check (currency in ('EUR', 'USD')),
  confirmation_number text,
  notes               text,
  created_at          timestamptz default now()
);

-- Same "last edited by ___" attribution as attractions (see comment above).
alter table hotels add column if not exists edited_by text;
alter table hotels add column if not exists updated_at timestamptz default now();

alter table hotels enable row level security;

drop policy if exists "public_select" on hotels;
drop policy if exists "public_insert" on hotels;
drop policy if exists "public_update" on hotels;
drop policy if exists "public_delete" on hotels;
create policy "public_select" on hotels for select using (true);
create policy "public_insert" on hotels for insert with check (true);
create policy "public_update" on hotels for update using (true);
create policy "public_delete" on hotels for delete using (true);

-- Enable Realtime (run once; also toggle the table on in the Supabase dashboard → Database → Replication)
alter table hotels replica identity full;
do $$ begin
  alter publication supabase_realtime add table hotels;
exception when duplicate_object then null; -- already added — fine on a re-run
end $$;

-- Per-day notes on the calendar (previously localStorage-only, so they
-- didn't sync across devices).
create table if not exists day_notes (
  date       date primary key,
  note       text not null default '',
  updated_at timestamptz default now()
);

-- Same "last edited by ___" attribution as attractions/hotels (not currently
-- surfaced in the UI for day notes, just recorded for later use).
alter table day_notes add column if not exists edited_by text;

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
