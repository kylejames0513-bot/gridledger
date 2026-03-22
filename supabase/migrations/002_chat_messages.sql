-- ──────────────────────────────────
-- CHAT MESSAGES (community)
-- ──────────────────────────────────
create table if not exists public.chat_messages (
  id          uuid primary key default uuid_generate_v4(),
  user_name   text not null,
  message     text not null,
  team_id     text references public.teams(id),
  flair       text default 'fan',
  created_at  timestamptz not null default now()
);

create index idx_chat_date on public.chat_messages(created_at desc);
create index idx_chat_team on public.chat_messages(team_id);

alter table public.chat_messages enable row level security;
create policy "Anyone can read chat" on public.chat_messages for select using (true);
create policy "Anyone can insert chat" on public.chat_messages for insert with check (true);

alter publication supabase_realtime add table public.chat_messages;
