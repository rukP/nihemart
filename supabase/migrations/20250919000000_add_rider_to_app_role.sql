DO $$
BEGIN
  -- Add 'rider' value to app_role enum if it doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'rider'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'rider';
  END IF;
END$$;
