-- Set up RLS policies for reviews-images bucket
-- Allow authenticated users to upload files
DROP POLICY IF EXISTS "Users can upload review images" ON storage.objects;
CREATE POLICY "Users can upload review images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'reviews-images'
        AND auth.role() = 'authenticated'
    );

-- Allow everyone to view files (since bucket is public)
DROP POLICY IF EXISTS "Users can view review images" ON storage.objects;
CREATE POLICY "Users can view review images" ON storage.objects
    FOR SELECT USING (bucket_id = 'reviews-images');

-- Allow authenticated users to delete their own uploaded files
DROP POLICY IF EXISTS "Users can delete review images" ON storage.objects;
CREATE POLICY "Users can delete review images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'reviews-images'
        AND auth.role() = 'authenticated'
    );

-- Allow admins to delete any review images
DROP POLICY IF EXISTS "Admins can delete review images" ON storage.objects;
CREATE POLICY "Admins can delete review images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'reviews-images'
        AND EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_roles.user_id = auth.uid()
            AND user_roles.role = 'admin'
        )
    );