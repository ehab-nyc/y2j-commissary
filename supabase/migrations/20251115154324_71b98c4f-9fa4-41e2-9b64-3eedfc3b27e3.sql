-- Add DELETE policy for star_cloudprnt_jobs table
CREATE POLICY "Authenticated users can delete print jobs"
ON star_cloudprnt_jobs
FOR DELETE
TO authenticated
USING (true);