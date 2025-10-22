-- Create themes table for custom theme management
CREATE TABLE IF NOT EXISTS public.themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Insert default system themes
INSERT INTO public.themes (name, is_system) VALUES
  ('default', true),
  ('halloween', true),
  ('christmas', true),
  ('christmas-wonderland', true)
ON CONFLICT (name) DO NOTHING;

-- Create login backgrounds table for multiple background management
CREATE TABLE IF NOT EXISTS public.login_backgrounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  quality INTEGER DEFAULT 80 CHECK (quality >= 1 AND quality <= 100),
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS on themes table
ALTER TABLE public.themes ENABLE ROW LEVEL SECURITY;

-- RLS policies for themes
CREATE POLICY "Everyone can view themes"
  ON public.themes FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage custom themes"
  ON public.themes FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Enable RLS on login_backgrounds table
ALTER TABLE public.login_backgrounds ENABLE ROW LEVEL SECURITY;

-- RLS policies for login_backgrounds
CREATE POLICY "Everyone can view backgrounds"
  ON public.login_backgrounds FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage backgrounds"
  ON public.login_backgrounds FOR ALL
  USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));