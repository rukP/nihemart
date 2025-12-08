-- Fix the column name in the notification trigger
-- Replace customer_user_id with user_id (the correct column name)

CREATE OR REPLACE FUNCTION public.notify_on_order_assignments_simple() 
RETURNS TRIGGER 
LANGUAGE plpgsql 
AS $$
DECLARE
  v_rider_user_id uuid;
BEGIN
  -- Try to get the auth user id for the rider
  IF (NEW.rider_id IS NOT NULL) THEN
    SELECT user_id INTO v_rider_user_id FROM public.riders WHERE id = NEW.rider_id LIMIT 1;
  ELSE
    v_rider_user_id := NULL;
  END IF;

  -- Only handle assignment creation notifications for riders
  -- Let the application code handle customer notifications properly
  IF (TG_OP = 'INSERT') THEN
    -- Notify the rider about new assignment
    IF v_rider_user_id IS NOT NULL THEN
      PERFORM public.insert_notification(
        v_rider_user_id,
        NULL,
        'assignment_created',
        'New delivery assigned',
        'You have a new delivery assignment. Please check the details and respond promptly.',
        (to_jsonb(NEW) || jsonb_build_object('order', (
          SELECT to_jsonb(o) FROM (
            SELECT id, order_number, delivery_address, delivery_notes, delivery_city, user_id
            FROM public.orders WHERE id = NEW.order_id LIMIT 1
          ) o
        )))
      );
    END IF;
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    -- Only notify about status changes, don't create customer notifications here
    -- The application code will handle customer notifications properly
    IF (NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM NEW.status) THEN
      -- Notify admin that rider accepted (concise)
      PERFORM public.insert_notification(
        NULL,
        'admin',
        'assignment_accepted',
        'Assignment Accepted',
        format('Rider accepted delivery for order %s', NEW.order_id),
        to_jsonb(NEW)
      );
      
      -- Notify rider (confirmation)
      IF v_rider_user_id IS NOT NULL THEN
        PERFORM public.insert_notification(
          v_rider_user_id,
          NULL,
          'assignment_accepted',
          'Assignment Accepted',
          format('You have accepted the delivery assignment for order %s', NEW.order_id),
          to_jsonb(NEW)
        );
      END IF;
      
      -- DO NOT create customer notification here - let application code handle it
      
    ELSIF (NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM NEW.status) THEN
      -- Notify admin about rejection
      PERFORM public.insert_notification(
        NULL,
        'admin',
        'assignment_rejected',
        'Assignment Rejected',
        format('Rider rejected delivery for order %s', NEW.order_id),
        to_jsonb(NEW)
      );
      
      -- Notify rider (confirmation)
      IF v_rider_user_id IS NOT NULL THEN
        PERFORM public.insert_notification(
          v_rider_user_id,
          NULL,
          'assignment_rejected',
          'Assignment Rejected', 
          format('You have rejected the delivery assignment for order %s', NEW.order_id),
          to_jsonb(NEW)
        );
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;