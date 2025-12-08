-- Create public storage bucket for rider images (idempotent)
INSERT INTO storage.buckets (id, name, public)
SELECT 'rider-images', 'rider-images', true
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'rider-images'
);

-- Storage policies: allow public read, admin-only writes
DO $$
BEGIN
  -- Read policy (public bucket typically serves files publicly, but add select for completeness)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read rider-images'
  ) THEN
    EXECUTE 'CREATE POLICY "Public read rider-images" ON storage.objects
      FOR SELECT
      USING (bucket_id = ''rider-images'')';
  END IF;

  -- Insert policy: only admins can upload
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admin insert rider-images'
  ) THEN
    EXECUTE 'CREATE POLICY "Admin insert rider-images" ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = ''rider-images'' AND EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid() AND ur.role = ''admin''
        )
      )';
  END IF;

  -- Update/Delete policy: only admins
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admin modify rider-images'
  ) THEN
    EXECUTE 'CREATE POLICY "Admin modify rider-images" ON storage.objects
      FOR UPDATE USING (
        bucket_id = ''rider-images'' AND EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid() AND ur.role = ''admin''
        )
      )
      WITH CHECK (
        bucket_id = ''rider-images'' AND EXISTS (
          SELECT 1 FROM public.user_roles ur
          WHERE ur.user_id = auth.uid() AND ur.role = ''admin''
        )
      )';
  END IF;
END $$ LANGUAGE plpgsql;


