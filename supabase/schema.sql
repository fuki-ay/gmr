-- ============================================================
-- GMR MVP — Supabase Schema
-- Paste this into your Supabase SQL editor and run it.
-- ============================================================

-- Rooms
create table rooms (
  id              uuid primary key default gen_random_uuid(),
  code            text unique not null,
  status          text not null default 'waiting',   -- 'waiting' | 'playing' | 'finished'
  current_round   int  not null default 0,           -- 0..9
  host_player_id  uuid,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index rooms_code_idx on rooms(code);

-- Players (max 2 per room)
create table players (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references rooms(id) on delete cascade,
  name        text not null,
  slot        text not null,                         -- 'A' | 'B'
  is_host     boolean not null default false,
  last_seen   timestamptz not null default now(),
  joined_at   timestamptz not null default now(),
  unique (room_id, slot)
);

create index players_room_idx on players(room_id);

-- Round answers (one row per player per round, max 20 per room)
create table round_answers (
  id            uuid primary key default gen_random_uuid(),
  room_id       uuid not null references rooms(id) on delete cascade,
  round_index   int  not null,                       -- 0..9
  player_id     uuid not null references players(id) on delete cascade,
  rating        int,                                 -- 1..5, null if skipped/timeout
  guess         int,                                 -- 1..5, null if skipped/timeout
  dont_know     boolean not null default false,
  rating_at     timestamptz,
  guess_at      timestamptz,
  unique (room_id, round_index, player_id)
);

create index round_answers_room_round_idx on round_answers(room_id, round_index);

-- ============================================================
-- RLS: disabled for MVP. Lock down before any public release.
-- ============================================================
alter table rooms disable row level security;
alter table players disable row level security;
alter table round_answers disable row level security;

-- ============================================================
-- Realtime: full replica identity so UPDATE/DELETE payloads
-- include both old and new row data.
-- ============================================================
alter table rooms replica identity full;
alter table players replica identity full;
alter table round_answers replica identity full;

-- Add these tables to the realtime publication.
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table round_answers;
