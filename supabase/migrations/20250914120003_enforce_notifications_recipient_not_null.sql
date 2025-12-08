-- Migration: enforce notifications recipient not null (recipient_user_id OR recipient_role)

-- Backfill existing rows:
-- 1) If recipient_user_id stores a riders.id, map to riders.user_id
update public.notifications n
set recipient_user_id = r.user_id
from public.riders r
where n.recipient_user_id = r.id
  and r.user_id is not null;

-- 2) For rows where both recipient_user_id and recipient_role are null but meta contains rider_id,
--    map to riders.user_id when possible, otherwise set recipient_role = 'rider'
update public.notifications n
set recipient_user_id = r.user_id,
    recipient_role = case when r.user_id is null then 'rider' else null end
from (
  select id, (meta->>'rider_id')::uuid as rider_id from public.notifications
  where recipient_user_id is null and recipient_role is null and meta ? 'rider_id'
) meta_rows
left join public.riders r on r.id = meta_rows.rider_id
where n.id = meta_rows.id;

-- 3) If meta contains an explicit user id field (meta->>'user_id'), set recipient_user_id
update public.notifications n
set recipient_user_id = (meta->>'user_id')::uuid
where recipient_user_id is null
  and recipient_role is null
  and meta ? 'user_id';

-- 4) As a final fallback for any remaining rows with both recipient fields null,
--    set recipient_role = 'admin' so notifications are visible to admins rather than lost.
update public.notifications
set recipient_role = 'admin'
where recipient_user_id is null and recipient_role is null;

-- Create a normalization trigger to prevent future inconsistent rows.
create or replace function public.notifications_before_insert_update() returns trigger language plpgsql as $$
declare
  v_rider_user_id uuid;
  v_rider_id uuid;
begin
  -- If recipient_user_id was set to a riders.id, map it to the rider's user_id
  if (new.recipient_user_id is not null) then
    select user_id into v_rider_user_id from public.riders where id = new.recipient_user_id limit 1;
    if v_rider_user_id is not null then
      new.recipient_user_id := v_rider_user_id;
      new.recipient_role := null;
      return new;
    end if;
  end if;

  -- If both recipient fields are null, try to resolve from meta
  if (new.recipient_user_id is null and new.recipient_role is null) then
    -- If meta contains rider_id, try to map to riders.user_id
    if (new.meta is not null and new.meta ? 'rider_id') then
      v_rider_id := (new.meta->>'rider_id')::uuid;
      select user_id into v_rider_user_id from public.riders where id = v_rider_id limit 1;
      if v_rider_user_id is not null then
        new.recipient_user_id := v_rider_user_id;
        new.recipient_role := null;
        return new;
      else
        -- no mapping found: mark as role-based rider notification
        new.recipient_role := 'rider';
        return new;
      end if;
    end if;

    -- If meta contains a user_id, use it
    if (new.meta is not null and new.meta ? 'user_id') then
      new.recipient_user_id := (new.meta->>'user_id')::uuid;
      new.recipient_role := null;
      return new;
    end if;

    -- Final fallback: mark as admin notification
    new.recipient_role := 'admin';
    return new;
  end if;

  -- If recipient_role is provided but recipient_user_id is a riders.id, clear the user id (role takes precedence)
  if (new.recipient_role is not null and new.recipient_user_id is not null) then
    -- try to detect if recipient_user_id refers to a rider id
    select user_id into v_rider_user_id from public.riders where id = new.recipient_user_id limit 1;
    if v_rider_user_id is not null then
      new.recipient_user_id := v_rider_user_id;
      new.recipient_role := null; -- prefer user-level notification if mapping exists
    end if;
  end if;

  return new;
end;
$$;

-- Install the trigger
drop trigger if exists trg_notifications_before_ins_upd on public.notifications;
create trigger trg_notifications_before_ins_upd
  before insert or update on public.notifications
  for each row execute function public.notifications_before_insert_update();

-- Finally add a constraint to enforce the rule: at least one recipient must be present
alter table public.notifications
  add constraint notifications_recipient_nonnull check (recipient_user_id is not null or recipient_role is not null);
