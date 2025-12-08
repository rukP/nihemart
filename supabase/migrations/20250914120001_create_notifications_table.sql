-- Migration: create notifications table and triggers
-- Ensure pgcrypto is available for gen_random_uuid()
create extension if not exists pgcrypto;

create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  recipient_user_id uuid null,
  recipient_role text null,
  type text not null,
  title text not null,
  body text null,
  meta jsonb null,
  read boolean default false,
  created_at timestamptz default now()
);

create index if not exists idx_notifications_recipient_user on public.notifications(recipient_user_id);
create index if not exists idx_notifications_recipient_role on public.notifications(recipient_role);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);

-- Function to insert notification
create or replace function public.insert_notification(
  p_recipient_user_id uuid,
  p_recipient_role text,
  p_type text,
  p_title text,
  p_body text,
  p_meta jsonb
) returns void language plpgsql as $$
BEGIN
  insert into public.notifications(recipient_user_id, recipient_role, type, title, body, meta)
  values (p_recipient_user_id, p_recipient_role, p_type, p_title, p_body, p_meta);
END;
$$;

-- Trigger function for order_assignments
create or replace function public.notify_on_order_assignments() returns trigger language plpgsql as $$
DECLARE
  v_order_number text;
  v_delivery_address text;
  v_rider_user_id uuid;
BEGIN
  -- attempt to look up order metadata for friendlier notifications
  begin
    select order_number, delivery_address into v_order_number, v_delivery_address
    from public.orders where id = new.order_id limit 1;
  exception when others then
    v_order_number := null;
    v_delivery_address := null;
  end;

  -- Try to resolve rider -> auth user mapping so notifications target the
  -- rider's auth user (recipient_user_id). If no mapping exists, leave
  -- recipient_user_id null and include rider id in meta so the client can
  -- still match by rider_id when filtering role=rider notifications.
  begin
    select user_id into v_rider_user_id from public.riders where id = new.rider_id limit 1;
  exception when others then
    v_rider_user_id := null;
  end;

  IF (TG_OP = 'INSERT') THEN
    -- Notify the rider assigned (target auth user if available)
    perform public.insert_notification(
      v_rider_user_id,
      'rider',
      'assignment_created',
      format('New delivery assigned — %s', coalesce(v_order_number::text, new.order_id::text)),
      format('Order %s has been assigned to you. Delivery to: %s', coalesce(v_order_number::text, new.order_id::text), coalesce(v_delivery_address::text, 'address not provided')),
      jsonb_build_object('assignment', to_jsonb(new), 'order_number', v_order_number, 'delivery_address', v_delivery_address, 'rider_id', new.rider_id)
    );

    -- NOTE: Admin notification is created by application code with richer content.
    -- We skip creating admin notification here to avoid duplicates.

    RETURN NEW;

  ELSIF (TG_OP = 'UPDATE') THEN
    IF (new.status = 'accepted' and old.status is distinct from new.status) THEN
      -- NOTE: Admin and customer notifications are created by application code.
      -- Only notify rider for confirmation here.

      -- notify rider (confirmation)
      perform public.insert_notification(
        v_rider_user_id,
        'rider',
        'assignment_accepted',
        format('Assignment accepted — %s', coalesce(v_order_number::text, new.order_id::text)),
        format('You accepted order %s', coalesce(v_order_number::text, new.order_id::text)),
        jsonb_build_object('assignment', to_jsonb(new), 'order_number', v_order_number, 'rider_id', new.rider_id)
      );

    ELSIF (new.status = 'rejected' and old.status is distinct from new.status) THEN
      -- NOTE: Admin notification is created by application code.
      -- Only notify rider for confirmation here.

      perform public.insert_notification(
        v_rider_user_id,
        'rider',
        'assignment_rejected',
        format('Assignment rejected — %s', coalesce(v_order_number::text, new.order_id::text)),
        format('You rejected order %s', coalesce(v_order_number::text, new.order_id::text)),
        jsonb_build_object('assignment', to_jsonb(new), 'order_number', v_order_number, 'rider_id', new.rider_id)
      );

    END IF;

    RETURN NEW;

  END IF;

  RETURN NULL;
END;
$$;

-- Trigger for assignments table
drop trigger if exists trg_notify_assignments on public.order_assignments;
create trigger trg_notify_assignments
  after insert or update on public.order_assignments
  for each row execute function public.notify_on_order_assignments();

-- Trigger function for orders table
create or replace function public.notify_on_orders() returns trigger language plpgsql as $$
begin
  if (TG_OP = 'UPDATE') then
    if (new.status is distinct from old.status) then
      -- Only notify the customer for meaningful final events like delivery.
      if (new.status = 'delivered') then
        -- NOTE: The application now creates enriched customer-facing
        -- 'order_delivered' notifications with detailed order & rider info.
        -- To avoid sending a short duplicate notification to the customer
        -- we only notify admins here. Customer notifications will be
        -- created by the server-side application code (service role).
        perform public.insert_notification(
          null,
          'admin',
          'order_delivered',
          format('Order %s delivered', coalesce(new.order_number::text, new.id::text)),
          format('Order %s was delivered', coalesce(new.order_number::text, new.id::text)),
          jsonb_build_object('old_status', old.status, 'new_status', new.status, 'order_id', new.id)
        );
      end if;
    end if;
    return new;
  end if;
  return null;
end;
$$;

-- Trigger for orders table
drop trigger if exists trg_notify_orders on public.orders;
create trigger trg_notify_orders
  after update on public.orders
  for each row execute function public.notify_on_orders();
