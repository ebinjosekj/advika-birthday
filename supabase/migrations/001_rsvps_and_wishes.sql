-- Advika's Magical Universe — RSVP + wishes schema.
-- The browser uses ONLY the anon/publishable key. RLS makes the anon role
-- insert-only for RSVPs (guests can't read each other's replies) and lets it
-- read wishes that the hosts haven't hidden.

create table if not exists public.rsvps (
  id          bigint generated always as identity primary key,
  client_id   uuid not null unique,                -- idempotency key: double submits are rejected
  name        text not null check (char_length(name) between 2 and 80 and name !~ '[<>]'),
  attending   boolean not null,
  attendees   smallint not null check (attendees between 0 and 10),
  message     text check (message is null or char_length(message) <= 300),
  created_at  timestamptz not null default now(),
  constraint attendees_match check ((attending and attendees >= 1) or (not attending and attendees = 0))
);

create table if not exists public.wishes (
  id          bigint generated always as identity primary key,
  name        text check (name is null or char_length(name) <= 40),
  message     text not null check (char_length(message) between 3 and 140),
  hidden      boolean not null default false,          -- hosts can hide a wish from the dashboard
  created_at  timestamptz not null default now()
);

alter table public.rsvps  enable row level security;
alter table public.wishes enable row level security;

-- RSVPs: anyone may insert; nobody but the service role may read/update/delete.
drop policy if exists "guests can rsvp" on public.rsvps;
create policy "guests can rsvp" on public.rsvps
  for insert to anon with check (true);

-- Wishes: anyone may add a visible wish and read visible wishes.
drop policy if exists "guests can wish" on public.wishes;
create policy "guests can wish" on public.wishes
  for insert to anon with check (hidden = false);

drop policy if exists "guests can read wishes" on public.wishes;
create policy "guests can read wishes" on public.wishes
  for select to anon using (hidden = false);

-- Column-level hardening: anon can only write the guest-facing columns.
revoke all on public.rsvps from anon;
grant insert (client_id, name, attending, attendees, message) on public.rsvps to anon;
revoke all on public.wishes from anon;
grant insert (name, message) on public.wishes to anon;
grant select (id, name, message, created_at) on public.wishes to anon;
