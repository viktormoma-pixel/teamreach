-- Roles enum
create type public.app_role as enum ('admin', 'user');

-- Profiles table linked to auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  telegram_id bigint unique,
  username text,
  first_name text,
  last_name text,
  photo_url text,
  language_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- User roles table (separate from profiles for security)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

-- Security definer function to check roles (avoids RLS recursion)
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Challenges
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  emoji text not null default '🎯',
  unit text not null,
  goal integer not null check (goal > 0),
  deadline date not null,
  surface text not null default 'blue' check (surface in ('blue','mint','peach','lilac')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Participants
create table public.challenge_participants (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (challenge_id, user_id)
);

-- Progress entries
create table public.progress_entries (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null check (amount > 0 and amount <= 1000000),
  day text not null,
  created_at timestamptz not null default now()
);

create index on public.challenge_participants (challenge_id);
create index on public.challenge_participants (user_id);
create index on public.progress_entries (challenge_id, user_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_challenges_updated before update on public.challenges
  for each row execute function public.set_updated_at();

-- Auto-create profile + default role on new auth user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, telegram_id, username, first_name, last_name, photo_url, language_code)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'telegram_id','')::bigint,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'photo_url',
    new.raw_user_meta_data->>'language_code'
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_participants enable row level security;
alter table public.progress_entries enable row level security;

-- Profiles: anyone authenticated can read; users update their own
create policy "Profiles readable by authenticated"
  on public.profiles for select to authenticated using (true);
create policy "Users update own profile"
  on public.profiles for update to authenticated using (auth.uid() = id);
create policy "Users insert own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);

-- User roles: users see their own roles; admins see all
create policy "Users see own roles"
  on public.user_roles for select to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "Admins manage roles"
  on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Challenges: all authenticated read; admin create/update/delete
create policy "Challenges readable by authenticated"
  on public.challenges for select to authenticated using (true);
create policy "Admins create challenges"
  on public.challenges for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update challenges"
  on public.challenges for update to authenticated
  using (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete challenges"
  on public.challenges for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Participants: all authenticated read; users join/leave themselves
create policy "Participants readable by authenticated"
  on public.challenge_participants for select to authenticated using (true);
create policy "Users join challenges"
  on public.challenge_participants for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Users leave challenges"
  on public.challenge_participants for delete to authenticated
  using (auth.uid() = user_id);

-- Progress: all authenticated read (for ranking); users insert their own
create policy "Progress readable by authenticated"
  on public.progress_entries for select to authenticated using (true);
create policy "Users add own progress"
  on public.progress_entries for insert to authenticated
  with check (auth.uid() = user_id);
create policy "Users delete own progress"
  on public.progress_entries for delete to authenticated
  using (auth.uid() = user_id);