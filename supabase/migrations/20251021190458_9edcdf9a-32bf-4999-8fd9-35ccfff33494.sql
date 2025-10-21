-- Configure storage bucket restrictions for file size and MIME types

-- Update product-images bucket with 5MB limit and allowed image types
UPDATE storage.buckets
SET 
  file_size_limit = 5242880, -- 5MB in bytes
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'product-images';

-- Update branding bucket with 2MB limit and allowed image types
UPDATE storage.buckets
SET 
  file_size_limit = 2097152, -- 2MB in bytes
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/svg+xml']
WHERE id = 'branding';

-- Update violation-images bucket with 10MB limit (for photo evidence)
UPDATE storage.buckets
SET 
  file_size_limit = 10485760, -- 10MB in bytes
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'violation-images';