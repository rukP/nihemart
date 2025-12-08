-- Add image and location columns to riders
ALTER TABLE IF EXISTS public.riders
ADD COLUMN IF NOT EXISTS image_url text,
ADD COLUMN IF NOT EXISTS location text;

-- Optional: create a storage bucket for rider images (if using Supabase SQL)
-- Note: If your project manages storage buckets via dashboard, you can ignore this.
-- INSERT INTO storage.buckets (id, name, public) VALUES ('rider-images', 'rider-images', true)
-- ON CONFLICT (id) DO NOTHING;

-- Helper view (optional) to compute rider earnings (sum of delivery fees) from completed assignments
-- This is not required for the app to work but can help with analytics.
CREATE OR REPLACE VIEW public.v_rider_earnings AS
SELECT
  oa.rider_id,
  COALESCE(SUM(CASE
    -- Transport fee is stored in orders.tax in this app's checkout flow
    WHEN o.status = 'delivered' OR oa.status = 'completed' THEN COALESCE(o.tax, 0)
    ELSE 0
  END), 0)::numeric AS earnings
FROM public.order_assignments oa
JOIN public.orders o ON o.id = oa.order_id
GROUP BY oa.rider_id;


