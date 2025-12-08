-- Add delivery_time column to orders so customers can request scheduled deliveries
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS delivery_time TIMESTAMPTZ;

-- Update get_order_stats function or other functions are unaffected; this is additive.
