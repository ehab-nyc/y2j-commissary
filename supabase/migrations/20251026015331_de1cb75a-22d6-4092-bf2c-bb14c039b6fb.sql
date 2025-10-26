-- Create table for weekly summary snapshots
CREATE TABLE IF NOT EXISTS public.weekly_summary_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  summary_data JSONB NOT NULL,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.weekly_summary_snapshots ENABLE ROW LEVEL SECURITY;

-- Admins can manage snapshots
CREATE POLICY "Admins can manage snapshots"
ON public.weekly_summary_snapshots
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Staff can view snapshots
CREATE POLICY "Staff can view snapshots"
ON public.weekly_summary_snapshots
FOR SELECT
USING (
  has_role(auth.uid(), 'worker'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Create index for faster queries
CREATE INDEX idx_weekly_summary_snapshots_dates ON public.weekly_summary_snapshots(week_start_date, week_end_date);
CREATE INDEX idx_weekly_summary_snapshots_created_at ON public.weekly_summary_snapshots(created_at DESC);