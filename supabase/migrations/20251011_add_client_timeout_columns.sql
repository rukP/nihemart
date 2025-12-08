-- Add client timeout columns to payments table
-- Date: 2025-10-11

-- Add client_timeout column
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS client_timeout BOOLEAN DEFAULT FALSE;

-- Add client_timeout_reason column
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS client_timeout_reason TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.payments.client_timeout IS 'Flag indicating if the payment timed out on the client side';
COMMENT ON COLUMN public.payments.client_timeout_reason IS 'Reason for client-side timeout (e.g., user navigation, network issues)';

-- Create index for performance if querying by timeout status
CREATE INDEX IF NOT EXISTS idx_payments_client_timeout ON public.payments(client_timeout) WHERE client_timeout = TRUE;