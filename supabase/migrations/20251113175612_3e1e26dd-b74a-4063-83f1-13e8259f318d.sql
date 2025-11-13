-- Create CloudPRNT job queue table
CREATE TABLE IF NOT EXISTS public.star_cloudprnt_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  job_data JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  printed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Add index for device_id lookups
CREATE INDEX idx_star_cloudprnt_device ON star_cloudprnt_jobs(device_id, status, created_at);

-- Enable RLS
ALTER TABLE public.star_cloudprnt_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Only authenticated users can create jobs
CREATE POLICY "Authenticated users can create print jobs"
ON public.star_cloudprnt_jobs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy: Anyone can read jobs (printer needs this)
CREATE POLICY "Public can read print jobs"
ON public.star_cloudprnt_jobs
FOR SELECT
TO public
USING (true);

-- Policy: Authenticated users can update job status
CREATE POLICY "Authenticated users can update job status"
ON public.star_cloudprnt_jobs
FOR UPDATE
TO authenticated
USING (true);

-- Add CloudPRNT settings to app_settings if not exists
INSERT INTO app_settings (key, value)
VALUES 
  ('star_cloudprnt_enabled', 'false'),
  ('star_cloudprnt_device_id', '')
ON CONFLICT (key) DO NOTHING;