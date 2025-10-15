-- Make violation-images bucket private for security
UPDATE storage.buckets 
SET public = false 
WHERE id = 'violation-images';