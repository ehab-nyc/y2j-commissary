-- Fix violation image storage and access issues

-- Update the storage policy to correctly match image paths
DROP POLICY IF EXISTS "Restricted violation image access" ON storage.objects;

CREATE POLICY "Restricted violation image access"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'violation-images' 
  AND (
    -- Staff can view all violation images
    has_role(auth.uid(), 'worker'::app_role) 
    OR has_role(auth.uid(), 'manager'::app_role) 
    OR has_role(auth.uid(), 'admin'::app_role)
    -- Customers can only view images for their own violations
    OR EXISTS (
      SELECT 1 
      FROM violations v
      JOIN violation_images vi ON v.id = vi.violation_id
      WHERE v.customer_id = auth.uid()
      -- Match against the actual storage path (just the filename without bucket prefix)
      AND (
        vi.image_url = 'violation-images/' || name
        OR vi.image_url = 'https://jscmqiktfesaggpdeegk.supabase.co/storage/v1/object/public/violation-images/' || name
        OR vi.image_url LIKE '%' || name
      )
    )
  )
);

-- Update old full URLs to just store the path
UPDATE violation_images
SET image_url = 
  CASE 
    WHEN image_url LIKE 'https://%' THEN 
      'violation-images/' || SUBSTRING(image_url FROM '.*/violation-images/(.*)')
    ELSE 
      image_url
  END
WHERE image_url LIKE 'https://%' OR image_url NOT LIKE 'violation-images/%';