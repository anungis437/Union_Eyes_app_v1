-- Supabase storage/functions-only deployment
-- Storage buckets and policies only.

-- =============================================================================
-- STORAGE BUCKETS
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'temp-files',
  'temp-files',
  false,
  104857600,
  ARRAY['application/pdf', 'text/plain', 'image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voice-recordings',
  'voice-recordings',
  false,
  26214400,
  ARRAY['audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp3', 'audio/mpeg', 'audio/mp4']
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- STORAGE POLICIES
-- =============================================================================

-- Avatars
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Temp files (service role only)
DROP POLICY IF EXISTS "Service role temp-files access" ON storage.objects;
CREATE POLICY "Service role temp-files access"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'temp-files')
WITH CHECK (bucket_id = 'temp-files');

-- Voice recordings
DROP POLICY IF EXISTS "Authenticated users can upload voice recordings" ON storage.objects;
CREATE POLICY "Authenticated users can upload voice recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'voice-recordings');

DROP POLICY IF EXISTS "Authenticated users can view voice recordings" ON storage.objects;
CREATE POLICY "Authenticated users can view voice recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'voice-recordings');

DROP POLICY IF EXISTS "Authenticated users can delete voice recordings" ON storage.objects;
CREATE POLICY "Authenticated users can delete voice recordings"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'voice-recordings');

DROP POLICY IF EXISTS "Service role voice recordings access" ON storage.objects;
CREATE POLICY "Service role voice recordings access"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'voice-recordings')
WITH CHECK (bucket_id = 'voice-recordings');

-- Dynamic document buckets (legal-documents-*, matter-documents-*, client-portal-*)
DROP POLICY IF EXISTS "Authenticated users can upload to document buckets" ON storage.objects;
CREATE POLICY "Authenticated users can upload to document buckets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id LIKE 'legal-documents-%'
  OR bucket_id LIKE 'matter-documents-%'
  OR bucket_id LIKE 'client-portal-%'
);

DROP POLICY IF EXISTS "Authenticated users can read document buckets" ON storage.objects;
CREATE POLICY "Authenticated users can read document buckets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id LIKE 'legal-documents-%'
  OR bucket_id LIKE 'matter-documents-%'
  OR bucket_id LIKE 'client-portal-%'
);

DROP POLICY IF EXISTS "Authenticated users can update document buckets" ON storage.objects;
CREATE POLICY "Authenticated users can update document buckets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id LIKE 'legal-documents-%'
  OR bucket_id LIKE 'matter-documents-%'
  OR bucket_id LIKE 'client-portal-%'
);

DROP POLICY IF EXISTS "Authenticated users can delete document buckets" ON storage.objects;
CREATE POLICY "Authenticated users can delete document buckets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id LIKE 'legal-documents-%'
  OR bucket_id LIKE 'matter-documents-%'
  OR bucket_id LIKE 'client-portal-%'
);

DROP POLICY IF EXISTS "Service role document buckets access" ON storage.objects;
CREATE POLICY "Service role document buckets access"
ON storage.objects FOR ALL
TO service_role
USING (
  bucket_id LIKE 'legal-documents-%'
  OR bucket_id LIKE 'matter-documents-%'
  OR bucket_id LIKE 'client-portal-%'
)
WITH CHECK (
  bucket_id LIKE 'legal-documents-%'
  OR bucket_id LIKE 'matter-documents-%'
  OR bucket_id LIKE 'client-portal-%'
);