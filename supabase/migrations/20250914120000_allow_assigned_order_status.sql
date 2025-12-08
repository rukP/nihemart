-- Migration: allow 'assigned' in orders.status check constraint

-- Some environments name constraints differently. We'll try to create a new constraint if none exists.
-- First drop any existing known constraint name (if present). If the constraint has a different name, this will harmlessly fail.

ALTER TABLE IF EXISTS public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Create a CHECK constraint that enforces allowed statuses including 'assigned'
ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check CHECK (status IN ('pending','processing','assigned','shipped','delivered','cancelled'));
