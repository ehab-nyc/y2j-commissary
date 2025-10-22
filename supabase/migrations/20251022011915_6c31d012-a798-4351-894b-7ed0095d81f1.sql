-- Create company_logos table for multiple logo options
CREATE TABLE IF NOT EXISTS public.company_logos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.company_logos ENABLE ROW LEVEL SECURITY;

-- Admins can manage logos
CREATE POLICY "Admins can manage logos"
ON public.company_logos
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Everyone can view logos
CREATE POLICY "Everyone can view logos"
ON public.company_logos
FOR SELECT
USING (true);

-- Update themes RLS to allow deletion of system themes
DROP POLICY IF EXISTS "Admins can manage custom themes" ON public.themes;

CREATE POLICY "Admins can manage all themes"
ON public.themes
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));