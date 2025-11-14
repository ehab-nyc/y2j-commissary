-- Drop the existing view that has security issues
DROP VIEW IF EXISTS public.theme_popularity_stats;

-- Recreate without SECURITY DEFINER (it's implied, so we'll use SECURITY INVOKER)
CREATE OR REPLACE VIEW public.theme_popularity_stats 
WITH (security_invoker = true)
AS
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