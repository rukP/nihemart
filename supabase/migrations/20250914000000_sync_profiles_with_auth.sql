-- Migration: create trigger to sync profiles from auth.users
-- This creates a function and trigger so that whenever a user is created/updated
-- in the auth.users table their profile row is inserted/updated in public.profiles

/*
  Notes:
  - This migration assumes a `public.profiles` table exists with at least columns:
    id (uuid primary key), full_name (text nullable), phone (text nullable), created_at (timestamp default now())
  - If your profiles table has additional NOT NULL columns, adjust the INSERT/ON CONFLICT accordingly.
  - Run this migration with the Supabase CLI or psql against your DB.
*/

create or replace function public.sync_profile_from_auth()
returns trigger
language plpgsql
as $$
begin
  -- Insert a profile row for the new user or update the existing one with metadata
  insert into public.profiles (id, full_name, phone, created_at)
  values (
    new.id,
    nullif(coalesce(new.user_metadata->>'full_name', ''), ''),
    nullif(coalesce(new.user_metadata->>'phone', ''), ''),
    now()
  )
  on conflict (id) do update
  set
    full_name = coalesce(nullif(coalesce(new.user_metadata->>'full_name', ''), ''), public.profiles.full_name),
    phone = coalesce(nullif(coalesce(new.user_metadata->>'phone', ''), ''), public.profiles.phone);

  return new;
end;
$$;

-- Create trigger (drop existing triggers with same name first)
drop trigger if exists trigger_sync_profile_on_auth_users on auth.users;
create trigger trigger_sync_profile_on_auth_users
after insert or update on auth.users
for each row execute procedure public.sync_profile_from_auth();
