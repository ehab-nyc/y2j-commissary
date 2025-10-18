-- Fix violation-images storage bucket to be private
-- This prevents direct URL access to violation evidence photos

UPDATE storage.buckets 
SET public = false 
WHERE id = 'violation-images';

-- Note: Existing RLS policies on violation_images table already restrict access properly
-- This change adds an additional security layer by requiring signed URLs