-- Add retry columns to star_cloudprnt_jobs table
ALTER TABLE star_cloudprnt_jobs
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_retries INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP WITH TIME ZONE;

-- Add index for efficient retry queries
CREATE INDEX IF NOT EXISTS idx_cloudprnt_jobs_retry 
ON star_cloudprnt_jobs(status, next_retry_at) 
WHERE status = 'failed' AND next_retry_at IS NOT NULL;

-- Add settings for retry configuration
INSERT INTO app_settings (key, value)
VALUES 
  ('star_cloudprnt_retry_enabled', 'true'),
  ('star_cloudprnt_retry_attempts', '3'),
  ('star_cloudprnt_retry_delay_minutes', '5')
ON CONFLICT (key) DO NOTHING;

-- Enable realtime for print jobs
ALTER TABLE star_cloudprnt_jobs REPLICA IDENTITY FULL;