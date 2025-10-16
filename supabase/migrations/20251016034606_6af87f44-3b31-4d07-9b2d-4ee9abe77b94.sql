-- Fix critical storage exposure: Replace permissive policy with restrictive access control
-- Drop the insecure policy that allows anyone to view violation images
DROP POLICY IF EXISTS "Anyone can view violation images" ON storage.objects;

-- Create restrictive policy for violation images
-- Staff can view all, customers can only view their own violation images
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
      AND vi.image_url = 'violation-images/' || name
    )
  )
);