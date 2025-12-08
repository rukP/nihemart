-- Migration: Clean up existing bad format notifications
-- This will remove the old "Rider on the way" notifications with bad formatting

-- Delete old badly formatted notifications
DELETE FROM public.notifications 
WHERE title = 'Rider on the way' 
  AND body LIKE 'This rider is going to deliver your order.%Rider,%No phone provided%';

-- Delete other variations of the bad format
DELETE FROM public.notifications 
WHERE (title = 'Rider on the way' OR title LIKE '%Rider on the way%')
  AND (body LIKE '%\\nRider,\\n%' OR body LIKE '%No phone provided%');

-- Also clean up any other old format notifications that might be causing issues
DELETE FROM public.notifications 
WHERE type = 'assignment_accepted' 
  AND body LIKE '%\\nRider,\\n%';

-- Clean up old assignment notifications that don't have proper content
DELETE FROM public.notifications 
WHERE type = 'assignment_accepted' 
  AND (body IS NULL OR LENGTH(TRIM(body)) < 50)
  AND created_at < NOW() - INTERVAL '1 hour';

-- Update any remaining assignment_accepted notifications to have better titles
UPDATE public.notifications 
SET title = 'Rider Assigned' 
WHERE type = 'assignment_accepted' 
  AND (title = 'Rider on the way' OR title IS NULL OR title = '');

-- Refresh materialized views if any exist
-- REFRESH MATERIALIZED VIEW IF EXISTS notification_summary;

-- Add a comment to track this cleanup
COMMENT ON TABLE public.notifications IS 'Cleaned up bad format notifications on 2025-10-11';