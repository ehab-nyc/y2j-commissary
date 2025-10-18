-- Enable RLS policies for branding bucket to allow super_admin users to upload/update files

-- Allow authenticated users to view files in branding bucket
CREATE POLICY "Anyone can view branding files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'branding');

-- Allow super_admin to upload files to branding bucket
CREATE POLICY "Super admin can upload branding files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'branding' AND
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Allow super_admin to update files in branding bucket
CREATE POLICY "Super admin can update branding files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'branding' AND
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Allow super_admin to delete files from branding bucket
CREATE POLICY "Super admin can delete branding files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'branding' AND
  has_role(auth.uid(), 'super_admin'::app_role)
);