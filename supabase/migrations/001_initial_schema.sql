-- ============================================================
-- GRIDLEDGER — Supabase Schema
-- Run this in the Supabase SQL Editor to set up your database
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ──────────────────────────────────
-- TEAMS
-- ──────────────────────────────────
create table public.teams (
  id          text primary key,          -- e.g. 'ARI', 'ATL'
  name        text not null,             -- 'Cardinals'
  city        text not null,             -- 'Arizona'
  conference  text not null check (conference in ('AFC','NFC')),
  division    text not null check (division in ('East','North','South','West')),
  color       text not null default '#333',
  accent      text not null default '#999',
  logo_url    text,
  cap_total   numeric(10,2) not null default 271.4,
  cap_used    numeric(10,2) not null default 0,
  cap_space   numeric(10,2) not null default 271.4,
  dead_money  numeric(10,2) not null default 0,
  updated_at  timestamptz not null default now()
);

-- ──────────────────────────────────
-- PLAYERS
-- ──────────────────────────────────
create table public.players (
  id              uuid primary key default uuid_generate_v4(),
  team_id         text references public.teams(id) on delete set null,
  name            text not null,
  position        text not null,
  number          int,
  age             int,
  experience      int default 0,
  status          text not null default 'active'
                  check (status in ('active','practice_squad','injured_reserve','pup','suspended','free_agent','retired')),
  roster_status   text not null default 'active'
                  check (roster_status in ('active','practice_squad','reserve','dead')),
  headshot_url    text,
  college         text,
  draft_year      int,
  draft_round     int,
  draft_pick      int,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_players_team on public.players(team_id);
create index idx_players_position on public.players(position);
create index idx_players_status on public.players(status);
create index idx_players_name on public.players(name);

-- ──────────────────────────────────
-- CONTRACTS
-- ──────────────────────────────────
create table public.contracts (
  id              uuid primary key default uuid_generate_v4(),
  player_id       uuid not null references public.players(id) on delete cascade,
  team_id         text not null references public.teams(id),
  total_value     numeric(10,2) default 0,
  years           int default 1,
  guaranteed      numeric(10,2) default 0,
  base_salary     numeric(10,2) default 0,
  cap_hit         numeric(10,2) default 0,
  dead_cap        numeric(10,2) default 0,
  signing_bonus   numeric(10,2) default 0,
  roster_bonus    numeric(10,2) default 0,
  option_bonus    numeric(10,2) default 0,
  incentives      numeric(10,2) default 0,
  year_signed     int,
  year_expires    int,
  is_current      boolean not null default true,
  created_at      timestamptz not null default now()
);

create index idx_contracts_player on public.contracts(player_id);
create index idx_contracts_team on public.contracts(team_id);
create index idx_contracts_current on public.contracts(is_current) where is_current = true;

-- ──────────────────────────────────
-- TRANSACTIONS (real NFL wire)
-- ──────────────────────────────────
create table public.transactions (
  id              uuid primary key default uuid_generate_v4(),
  player_name     text not null,
  player_id       uuid references public.players(id) on delete set null,
  from_team_id    text references public.teams(id),
  to_team_id      text references public.teams(id),
  type            text not null,         -- 'trade','signing','release','waiver','reserve','restructure'
  subtype         text,                  -- 'UFA','post_june_1','via_waivers', etc
  details         text,
  cap_impact      numeric(10,2),
  transaction_date date not null default current_date,
  source_url      text,
  created_at      timestamptz not null default now()
);

create index idx_transactions_date on public.transactions(transaction_date desc);
create index idx_transactions_type on public.transactions(type);
create index idx_transactions_team on public.transactions(from_team_id);

-- ──────────────────────────────────
-- DRAFT PICKS
-- ──────────────────────────────────
create table public.draft_picks (
  id              uuid primary key default uuid_generate_v4(),
  original_team   text not null references public.teams(id),
  current_owner   text not null references public.teams(id),
  round           int not null check (round between 1 and 7),
  year            int not null,
  pick_number     int,                   -- null until draft order set
  trade_value     int default 0,
  conditions      text,
  created_at      timestamptz not null default now()
);

create index idx_picks_owner on public.draft_picks(current_owner);

-- ──────────────────────────────────
-- USER GM SCENARIOS
-- ──────────────────────────────────
create table public.gm_scenarios (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid,                  -- nullable for anonymous users
  session_id      text not null,         -- browser session fallback
  team_id         text not null references public.teams(id),
  name            text default 'My Scenario',
  is_active       boolean default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_scenarios_session on public.gm_scenarios(session_id);

-- ──────────────────────────────────
-- GM MOVES (within a scenario)
-- ──────────────────────────────────
create table public.gm_moves (
  id              uuid primary key default uuid_generate_v4(),
  scenario_id     uuid not null references public.gm_scenarios(id) on delete cascade,
  move_type       text not null check (move_type in ('cut','post_june_1','restructure','extend','trade','sign_fa')),
  player_id       uuid references public.players(id),
  player_name     text not null,
  details         jsonb not null default '{}',
  cap_impact      numeric(10,2) default 0,
  move_order      int not null default 0,
  created_at      timestamptz not null default now()
);

create index idx_moves_scenario on public.gm_moves(scenario_id);

-- ──────────────────────────────────
-- NEWS / BREAKING ALERTS
-- ──────────────────────────────────
create table public.news (
  id              uuid primary key default uuid_generate_v4(),
  headline        text not null,
  body            text,
  category        text not null check (category in ('trade','signing','cut','restructure','injury','draft','other')),
  team_ids        text[] default '{}',
  source          text,
  source_url      text,
  is_breaking     boolean default false,
  published_at    timestamptz not null default now()
);

create index idx_news_date on public.news(published_at desc);
create index idx_news_breaking on public.news(is_breaking) where is_breaking = true;

-- ──────────────────────────────────
-- ENABLE REALTIME
-- ──────────────────────────────────
alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.news;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.contracts;

-- ──────────────────────────────────
-- ROW LEVEL SECURITY
-- ──────────────────────────────────
alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.contracts enable row level security;
alter table public.transactions enable row level security;
alter table public.draft_picks enable row level security;
alter table public.news enable row level security;
alter table public.gm_scenarios enable row level security;
alter table public.gm_moves enable row level security;

-- Public read for all reference data
create policy "Public read teams" on public.teams for select using (true);
create policy "Public read players" on public.players for select using (true);
create policy "Public read contracts" on public.contracts for select using (true);
create policy "Public read transactions" on public.transactions for select using (true);
create policy "Public read picks" on public.draft_picks for select using (true);
create policy "Public read news" on public.news for select using (true);

-- GM scenarios: users can read/write their own (by session_id)
create policy "Read own scenarios" on public.gm_scenarios for select using (true);
create policy "Insert own scenarios" on public.gm_scenarios for insert with check (true);
create policy "Update own scenarios" on public.gm_scenarios for update using (true);
create policy "Delete own scenarios" on public.gm_scenarios for delete using (true);

create policy "Read own moves" on public.gm_moves for select using (true);
create policy "Insert own moves" on public.gm_moves for insert with check (true);
create policy "Delete own moves" on public.gm_moves for delete using (true);

-- Service role can do anything (for sync/seed scripts)
-- (handled automatically by Supabase service role key)

-- ──────────────────────────────────
-- HELPER FUNCTIONS
-- ──────────────────────────────────

-- Recalculate team cap totals
create or replace function recalc_team_cap(tid text)
returns void language plpgsql as $$
declare
  used numeric;
  dead numeric;
begin
  select coalesce(sum(c.cap_hit), 0), coalesce(sum(case when p.roster_status = 'dead' then c.dead_cap else 0 end), 0)
  into used, dead
  from contracts c
  join players p on p.id = c.player_id
  where c.team_id = tid and c.is_current = true;

  update teams set
    cap_used = used,
    cap_space = cap_total - used,
    dead_money = dead,
    updated_at = now()
  where id = tid;
end;
$$;

-- Auto-update timestamp
create or replace function update_timestamp()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_players_updated before update on public.players
  for each row execute function update_timestamp();
create trigger trg_scenarios_updated before update on public.gm_scenarios
  for each row execute function update_timestamp();
