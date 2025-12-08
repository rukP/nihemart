-- Add unique index on payments.reference to prevent duplicate rows per payment attempt
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_reference_unique ON public.payments(reference);

COMMENT ON INDEX idx_payments_reference_unique IS 'Unique index on payment reference prevents duplicate payments during concurrency.';
