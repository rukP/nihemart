-- Allow multiple payments per order by removing unique constraint on order_id
-- This migration makes `payments.order_id` nullable (if not already) and
-- removes the unique constraint that prevented multiple payment attempts for the
-- same order. It also ensures an index exists for performance.

-- Drop the unique constraint on order_id if present
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.payments'::regclass
          AND contype = 'u'
          AND conname = 'payments_order_id_key'
    ) THEN
        ALTER TABLE public.payments DROP CONSTRAINT payments_order_id_key;
    END IF;
END $$;

-- Make order_id nullable if it's still NOT NULL
ALTER TABLE public.payments ALTER COLUMN order_id DROP NOT NULL;

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_reference_unique ON public.payments(reference);

COMMENT ON COLUMN public.payments.order_id IS 'Nullable order_id for payments; multiple payment attempts allowed per order.';
COMMENT ON INDEX idx_payments_reference_unique IS 'Unique index on payment reference prevents duplicate payments during concurrency.';
