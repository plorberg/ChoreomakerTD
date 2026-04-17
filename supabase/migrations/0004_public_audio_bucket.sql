-- 0004_public_audio_bucket.sql
-- Make the audio bucket public so files can be accessed by URL without
-- signed tokens. The files are protected by unguessable UUID paths.
-- This eliminates all signed-URL expiration and CORS issues for share-link
-- visitors.

update storage.buckets
  set public = true
  where id = 'audio';

-- With a public bucket, the existing RLS policies on storage.objects still
-- control who can INSERT and DELETE, but SELECT is open (public reads).
-- That's exactly what we want: owners upload/delete, everyone reads.
