-- Add RLS policies for storage buckets to prevent unauthorized uploads

-- Policy: Only admins and super_admins can upload to branding bucket
CREATE POLICY "Only admins can upload branding files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'branding' AND
  (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Policy: Staff can upload product images
CREATE POLICY "Staff can upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images' AND
  (has_role(auth.uid(), 'worker'::app_role) OR 
   has_role(auth.uid(), 'manager'::app_role) OR 
   has_role(auth.uid(), 'admin'::app_role) OR 
   has_role(auth.uid(), 'super_admin'::app_role))
);

-- Policy: Only admins can update branding files
CREATE POLICY "Only admins can update branding files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'branding' AND
  (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Policy: Staff can update product images
CREATE POLICY "Staff can update product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images' AND
  (has_role(auth.uid(), 'worker'::app_role) OR 
   has_role(auth.uid(), 'manager'::app_role) OR 
   has_role(auth.uid(), 'admin'::app_role) OR 
   has_role(auth.uid(), 'super_admin'::app_role))
);

-- Policy: Only admins can delete branding files
CREATE POLICY "Only admins can delete branding files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'branding' AND
  (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
);

-- Policy: Staff can delete product images
CREATE POLICY "Staff can delete product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images' AND
  (has_role(auth.uid(), 'manager'::app_role) OR 
   has_role(auth.uid(), 'admin'::app_role) OR 
   has_role(auth.uid(), 'super_admin'::app_role))
);