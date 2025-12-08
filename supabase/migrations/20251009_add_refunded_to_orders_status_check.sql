-- Migration: add 'refunded' to orders.status check constraint

-- Drop existing constraint if it exists (safe to run multiple times)
ALTER TABLE IF EXISTS public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Recreate the constraint including 'refunded'
ALTER TABLE public.orders
  ADD CONSTRAINT orders_status_check CHECK (status IN ('pending','processing','assigned','shipped','delivered','cancelled','refunded'));
