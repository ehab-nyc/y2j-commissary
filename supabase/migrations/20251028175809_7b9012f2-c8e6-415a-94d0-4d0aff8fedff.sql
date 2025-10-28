-- Create CloudPRNT job queue table
CREATE TABLE IF NOT EXISTS public.cloudprnt_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  printer_mac TEXT NOT NULL,
  job_data JSONB NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'printing', 'completed', 'error')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- Enable RLS
ALTER TABLE public.cloudprnt_queue ENABLE ROW LEVEL SECURITY;

-- Policies: Allow printer to read pending jobs (public access for printer)
CREATE POLICY "Allow printer to read pending jobs"
  ON public.cloudprnt_queue
  FOR SELECT
  USING (status = 'pending');

-- Policy: Allow authenticated users to insert jobs
CREATE POLICY "Allow authenticated users to create print jobs"
  ON public.cloudprnt_queue
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow printer to update job status (public access)
CREATE POLICY "Allow printer to update job status"
  ON public.cloudprnt_queue
  FOR UPDATE
  USING (true);

-- Policy: Allow authenticated users to view all jobs
CREATE POLICY "Allow authenticated users to view all jobs"
  ON public.cloudprnt_queue
  FOR SELECT
  TO authenticated
  USING (true);

-- Add index for performance
CREATE INDEX idx_cloudprnt_queue_status ON public.cloudprnt_queue(status, created_at);
CREATE INDEX idx_cloudprnt_queue_printer ON public.cloudprnt_queue(printer_mac, status);

-- Add CloudPRNT settings to app_settings
INSERT INTO public.app_settings (key, value)
VALUES 
  ('cloudprnt_enabled', 'false'),
  ('cloudprnt_printer_mac', '')
ON CONFLICT (key) DO NOTHING;