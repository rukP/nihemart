-- 1) Create roles enum
create type public.app_role as enum ('admin', 'user');

-- 2) Profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  address text,
  city text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- 3) Updated_at trigger function (shared)
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for profiles
create trigger update_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

-- 4) User roles table
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- 5) Role check function (security definer)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  );
$$;

-- 6) RLS policies for profiles
-- Allow users to view/update/insert their own profile
create policy "Users can view own profile" on public.profiles
for select to authenticated using (auth.uid() = id);

create policy "Users can upsert own profile" on public.profiles
for insert to authenticated with check (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
for update to authenticated using (auth.uid() = id);

-- Admins can view/update all profiles
create policy "Admins can view all profiles" on public.profiles
for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update all profiles" on public.profiles
for update to authenticated using (public.has_role(auth.uid(), 'admin'));

-- 7) RLS policies for user_roles
create policy "Users can view their roles" on public.user_roles
for select to authenticated using (user_id = auth.uid());

create policy "Admins can view all roles" on public.user_roles
for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- 8) New user trigger to create profile and default role
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Create empty profile
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;

  -- Assign default role 'user'
  insert into public.user_roles (user_id, role)
  values (new.id, 'user')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

-- Create trigger on auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
