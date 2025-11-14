-- Create theme versions table for tracking history
CREATE TABLE IF NOT EXISTS public.theme_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  theme_id UUID NOT NULL REFERENCES public.themes(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  colors JSONB,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.theme_versions ENABLE ROW LEVEL SECURITY;

-- Admins can view all theme versions
CREATE POLICY "Admins can view theme versions"
ON public.theme_versions
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- System can insert theme versions
CREATE POLICY "System can insert theme versions"
ON public.theme_versions
FOR INSERT
WITH CHECK (true);

-- Admins can delete theme versions
CREATE POLICY "Admins can delete theme versions"
ON public.theme_versions
FOR DELETE
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Create index for faster queries
CREATE INDEX idx_theme_versions_theme_id ON public.theme_versions(theme_id);
CREATE INDEX idx_theme_versions_created_at ON public.theme_versions(created_at DESC);