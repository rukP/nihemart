
BEGIN;


-- Create or replace function to mark order paid when payment completed
CREATE OR REPLACE FUNCTION public.fn_mark_order_paid_on_payment_completed()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Use case-insensitive check for status and require an order_id.
  IF (LOWER(COALESCE(NEW.status, '')) = 'completed' AND NEW.order_id IS NOT NULL) THEN
    -- Set completed_at only if it's not already set. This UPDATE touches
    -- completed_at and updated_at but does not change 'status' or 'order_id',
    -- so it will not retrigger this trigger (trigger is created only for
    -- updates of status and order_id below).
    UPDATE public.payments
    SET completed_at = COALESCE(NEW.completed_at, now()), updated_at = now()
    WHERE id = NEW.id AND completed_at IS NULL;

    -- Update the associated order to mark it as paid. Use a conservative
    -- WHERE clause to avoid noisy writes if the order is already marked paid.
    UPDATE public.orders
    SET payment_status = 'paid', is_paid = true, updated_at = now()
    WHERE id = NEW.order_id AND (COALESCE(payment_status, '') IS DISTINCT FROM 'paid' OR is_paid IS DISTINCT FROM true);
  END IF;

  RETURN NEW;
END;
$$;


DROP TRIGGER IF EXISTS trg_payment_completed_on_payments ON public.payments;

CREATE TRIGGER trg_payment_completed_on_payments
AFTER INSERT OR UPDATE OF status, order_id ON public.payments
FOR EACH ROW
WHEN (LOWER(COALESCE(NEW.status, '')) = 'completed' AND NEW.order_id IS NOT NULL)
EXECUTE PROCEDURE public.fn_mark_order_paid_on_payment_completed();
COMMIT;
