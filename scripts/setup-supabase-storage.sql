-- Supabase Storage Setup for Voice Recordings
-- Run this in your Supabase SQL Editor or via API

-- 1. Create the voice-recordings bucket (if not exists)
-- Note: This should be done via Supabase Dashboard > Storage
-- or using the Supabase Management API

-- 2. Set up storage policies for the voice-recordings bucket

-- Allow authenticated users to upload their own voice recordings
CREATE POLICY "Authenticated users can upload voice recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'voice-recordings' 
  AND (storage.foldername(name))[1] = 'claims'
);

-- Allow authenticated users to read voice recordings
CREATE POLICY "Authenticated users can view voice recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'voice-recordings');

-- Allow authenticated users to delete their own recordings
CREATE POLICY "Users can delete their own voice recordings"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'voice-recordings'
);

-- Allow service role full access (for API operations)
CREATE POLICY "Service role has full access"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'voice-recordings');

-- Optional: Set up a function to clean up old temporary recordings
CREATE OR REPLACE FUNCTION cleanup_temp_voice_recordings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete temporary recordings older than 24 hours
  DELETE FROM storage.objects
  WHERE bucket_id = 'voice-recordings'
    AND (storage.foldername(name))[1] = 'temp'
    AND created_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- Optional: Create a scheduled job to run cleanup daily
-- This requires pg_cron extension (available in Supabase Pro)
-- SELECT cron.schedule(
--   'cleanup-temp-voice-recordings',
--   '0 2 * * *', -- Run at 2 AM daily
--   'SELECT cleanup_temp_voice_recordings();'
-- );
