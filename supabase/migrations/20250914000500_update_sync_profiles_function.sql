-- Migration: make sync_profile_from_auth resilient (catch exceptions)
-- Replaces the previous function with a version that will not raise on errors
-- which ensures auth.user creation won't fail if profiles insert/update has issues.

create or replace function public.sync_profile_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  begin
    -- Try to upsert a minimal profile row using metadata when available.
    -- Run as SECURITY DEFINER with search_path=public so this function can
    -- write to public.profiles regardless of the role that inserted into
    -- auth.users (eg. anon or service role). Keep resilient exception
    -- handling so user creation does not fail if profile upsert fails.
    insert into public.profiles (id, full_name, phone)
    values (
      new.id,
      nullif(coalesce(new.user_metadata->>'full_name', ''), ''),
      nullif(coalesce(new.user_metadata->>'phone', ''), '')
    )
    on conflict (id) do update
    set
      full_name = coalesce(nullif(coalesce(new.user_metadata->>'full_name', ''), ''), public.profiles.full_name),
      phone = coalesce(nullif(coalesce(new.user_metadata->>'phone', ''), ''), public.profiles.phone);
  exception when others then
    -- Don't fail the outer transaction (user creation). Log a notice for debugging.
    raise notice 'sync_profile_from_auth: profile upsert failed for user % - %', new.id, SQLERRM;
  end;

  return new;
end;
$$;
