-- ═══════════════════════════════════════════════
-- GRIDLEDGER AUTH + PROFILES
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════

-- Profiles table (linked to Supabase Auth)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  display_name text,
  is_pro      boolean default false,
  pro_expires timestamptz,
  favorite_team text references public.teams(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_profiles_email on public.profiles(email);

-- RLS
alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "profiles_read_own" on public.profiles
  for select using (auth.uid() = id);

-- Users can update their own profile
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Service role can do anything
create policy "profiles_service" on public.profiles
  for all using (true);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users insert
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Also make sure news table has a 'title' alias-friendly setup
-- (our frontend uses 'title' but table has 'headline')
-- We'll handle this in the app layer

-- Unique constraint on news to prevent dupes
create unique index if not exists idx_news_headline_unique
  on public.news(headline, published_at);

-- Unique constraint on transactions to prevent dupes  
create unique index if not exists idx_tx_unique
  on public.transactions(player_name, type, transaction_date);
