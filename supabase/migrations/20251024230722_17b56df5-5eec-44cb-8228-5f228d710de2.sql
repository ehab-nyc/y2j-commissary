-- Create enum for announcement categories
CREATE TYPE announcement_category AS ENUM ('price', 'fleet', 'general');

-- Create enum for announcement priorities
CREATE TYPE announcement_priority AS ENUM ('urgent', 'important', 'info');

-- Create announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category announcement_category NOT NULL DEFAULT 'general',
  priority announcement_priority NOT NULL DEFAULT 'info',
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create dismissed announcements tracking table
CREATE TABLE public.user_dismissed_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, announcement_id)
);

-- Enable RLS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_dismissed_announcements ENABLE ROW LEVEL SECURITY;

-- RLS Policies for announcements
CREATE POLICY "Everyone can view active announcements"
  ON public.announcements
  FOR SELECT
  USING (
    active = true 
    AND start_date <= now() 
    AND (end_date IS NULL OR end_date >= now())
  );

CREATE POLICY "Admins can manage announcements"
  ON public.announcements
  FOR ALL
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- RLS Policies for dismissed announcements
CREATE POLICY "Users can view their own dismissals"
  ON public.user_dismissed_announcements
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can dismiss announcements"
  ON public.user_dismissed_announcements
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their dismissals"
  ON public.user_dismissed_announcements
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_announcements_active_dates 
  ON public.announcements(active, start_date, end_date) 
  WHERE active = true;