-- Supabase migration: create profiles, teams, team_members, and notes tables with RLS policies

-- Ensure required extensions exist
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- Utility function for timestamps ------------------------------------------------
create or replace function public.set_timestamps()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

-- Profiles table mirrors auth.users with additional metadata ---------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by their owner" on public.profiles
  for select using (auth.uid() = id);

create policy "Profiles are updatable by their owner" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Profiles are insertable by their owner" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Profiles are deletable by their owner" on public.profiles
  for delete using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do update
    set display_name = excluded.display_name,
        avatar_url = excluded.avatar_url,
        updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Teams table -------------------------------------------------------------------
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users on delete cascade,
  name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.teams enable row level security;

-- Team members table ------------------------------------------------------------
create table if not exists public.team_members (
  team_id uuid not null references public.teams on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (team_id, user_id)
);

alter table public.team_members enable row level security;

-- Functions that depend on tables ----------------------------------------------
create or replace function public.is_team_member(team uuid)
returns boolean as $$
  select exists (
    select 1 from public.team_members tm
    where tm.team_id = team and tm.user_id = auth.uid()
  );
$$ language sql stable;

create or replace function public.is_team_owner(team uuid)
returns boolean as $$
  select exists (
    select 1 from public.teams t
    where t.id = team and t.owner_id = auth.uid()
  );
$$ language sql stable;

create or replace function public.handle_new_team()
returns trigger as $$
begin
  insert into public.team_members (team_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (team_id, user_id) do update
    set role = 'owner',
        updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql security definer;

-- Triggers ----------------------------------------------------------------------
drop trigger if exists teams_updated_at on public.teams;
create trigger teams_updated_at before update on public.teams
  for each row execute procedure public.set_timestamps();

drop trigger if exists on_team_created on public.teams;
create trigger on_team_created
  after insert on public.teams
  for each row execute procedure public.handle_new_team();

drop trigger if exists team_members_updated_at on public.team_members;
create trigger team_members_updated_at before update on public.team_members
  for each row execute procedure public.set_timestamps();

-- Team policies -----------------------------------------------------------------
create policy "Teams are viewable by members" on public.teams
  for select using (public.is_team_member(id));

create policy "Teams are manageable by owner" on public.teams
  for update using (public.is_team_owner(id)) with check (public.is_team_owner(id));

create policy "Teams are insertable by owner" on public.teams
  for insert with check (auth.uid() = owner_id);

create policy "Teams are deletable by owner" on public.teams
  for delete using (public.is_team_owner(id));

create index if not exists teams_owner_id_idx on public.teams (owner_id);

create policy "Team members can view membership" on public.team_members
  for select using (public.is_team_member(team_id));

create policy "Team owners or users can join" on public.team_members
  for insert with check (public.is_team_owner(team_id) or auth.uid() = user_id);

create policy "Team owners manage membership" on public.team_members
  for update using (public.is_team_owner(team_id)) with check (public.is_team_owner(team_id));

create policy "Team owners or users can remove membership" on public.team_members
  for delete using (public.is_team_owner(team_id) or auth.uid() = user_id);

create index if not exists team_members_user_id_idx on public.team_members (user_id);

-- Notes table -------------------------------------------------------------------
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams on delete cascade,
  author_id uuid not null references auth.users on delete cascade,
  title text not null,
  content text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.notes enable row level security;

drop trigger if exists notes_updated_at on public.notes;
create trigger notes_updated_at before update on public.notes
  for each row execute procedure public.set_timestamps();

create policy "Team members can view notes" on public.notes
  for select using (public.is_team_member(team_id));

create policy "Team members can create notes" on public.notes
  for insert with check (auth.uid() = author_id and public.is_team_member(team_id));

create policy "Authors can update notes" on public.notes
  for update using (auth.uid() = author_id) with check (auth.uid() = author_id and public.is_team_member(team_id));

create policy "Authors or owners can delete notes" on public.notes
  for delete using (auth.uid() = author_id or public.is_team_owner(team_id));

create index if not exists notes_team_id_created_at_idx on public.notes (team_id, created_at desc);
