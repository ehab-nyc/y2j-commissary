-- Create app_settings table for storing application configuration
CREATE TABLE public.app_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "Everyone can view app settings"
  ON public.app_settings
  FOR SELECT
  USING (true);

-- Only admins can update settings
CREATE POLICY "Admins can update app settings"
  ON public.app_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_app_settings_updated_at
  BEFORE UPDATE ON public.app_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.app_settings (key, value) VALUES
  ('company_name', 'Commissary System'),
  ('logo_url', ''),
  ('login_background_url', '');

-- Create storage bucket for branding assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for branding bucket
CREATE POLICY "Public can view branding assets"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'branding');

CREATE POLICY "Admins can upload branding assets"
  ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'branding' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update branding assets"
  ON storage.objects
  FOR UPDATE
  USING (bucket_id = 'branding' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete branding assets"
  ON storage.objects
  FOR DELETE
  USING (bucket_id = 'branding' AND has_role(auth.uid(), 'admin'::app_role));