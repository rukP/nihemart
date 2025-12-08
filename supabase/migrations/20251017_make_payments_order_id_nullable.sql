-- Make payments.order_id nullable to support session-like payments
ALTER TABLE public.payments
    ALTER COLUMN order_id DROP NOT NULL;

-- Ensure index on order_id remains (no-op if already present)
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);

COMMENT ON COLUMN public.payments.order_id IS 'Nullable order_id for session-based payments; will be set when an order is created on finalize.';
