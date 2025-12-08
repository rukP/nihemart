-- Migration: add refund fields to order_items and orders
-- Date: 2025-09-24

-- Add refund columns to order_items
ALTER TABLE public.order_items
  DROP COLUMN IF EXISTS rejected,
  DROP COLUMN IF EXISTS rejected_reason;

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS refund_requested BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS refund_reason TEXT,
  ADD COLUMN IF NOT EXISTS refund_status TEXT,
  ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_expires_at TIMESTAMPTZ;

-- Optionally, add order-level refund tracking (for full order refunds)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS refund_requested BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS refund_reason TEXT,
  ADD COLUMN IF NOT EXISTS refund_status TEXT,
  ADD COLUMN IF NOT EXISTS refund_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS refund_expires_at TIMESTAMPTZ;

-- Create an index to quickly lookup refund requests
CREATE INDEX IF NOT EXISTS idx_order_items_refund_status ON public.order_items(refund_status);
CREATE INDEX IF NOT EXISTS idx_orders_refund_status ON public.orders(refund_status);

-- Note: This migration removes the old 'rejected' columns. Ensure you backup data if needed before applying.
