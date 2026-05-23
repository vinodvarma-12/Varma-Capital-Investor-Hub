-- Market preferences: per-investor watchlist (stores hidden symbols so all are shown by default)
create table if not exists public.market_preferences (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  hidden_symbols text[] not null default '{}',
  created_date  timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint market_preferences_user_id_unique unique (user_id)
);

-- RLS
alter table public.market_preferences enable row level security;

create policy "Users can read own preferences"
  on public.market_preferences for select
  using (auth.uid() = user_id);

create policy "Users can insert own preferences"
  on public.market_preferences for insert
  with check (auth.uid() = user_id);

create policy "Users can update own preferences"
  on public.market_preferences for update
  using (auth.uid() = user_id);

-- Auto-update updated_at
create or replace function public.set_market_preferences_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger market_preferences_updated_at
  before update on public.market_preferences
  for each row execute function public.set_market_preferences_updated_at();
