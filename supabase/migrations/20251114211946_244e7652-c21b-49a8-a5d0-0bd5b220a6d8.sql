-- Create theme analytics table to track theme usage
CREATE TABLE public.theme_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  theme_name TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'activate', 'preview', 'favorite', 'unfavorite'
  session_duration INTEGER, -- in seconds, for tracking engagement
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.theme_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can insert their own analytics" 
ON public.theme_analytics 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all analytics" 
ON public.theme_analytics 
FOR SELECT 
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Create indexes for better query performance
CREATE INDEX idx_theme_analytics_user_id ON public.theme_analytics(user_id);
CREATE INDEX idx_theme_analytics_theme_name ON public.theme_analytics(theme_name);
CREATE INDEX idx_theme_analytics_action_type ON public.theme_analytics(action_type);
CREATE INDEX idx_theme_analytics_created_at ON public.theme_analytics(created_at DESC);

-- Create a view for theme popularity stats
CREATE OR REPLACE VIEW public.theme_popularity_stats AS
SELECT 
  theme_name,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) FILTER (WHERE action_type = 'activate') as activation_count,
  COUNT(*) FILTER (WHERE action_type = 'preview') as preview_count,
  COUNT(*) FILTER (WHERE action_type = 'favorite') as favorite_count,
  AVG(session_duration) FILTER (WHERE session_duration IS NOT NULL) as avg_session_duration,
  MAX(created_at) as last_used_at
FROM public.theme_analytics
GROUP BY theme_name
ORDER BY activation_count DESC;

-- Grant access to the view for admins
CREATE POLICY "Admins can view theme stats" 
ON public.theme_analytics 
FOR SELECT 
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);