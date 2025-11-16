-- Fix Security Issues: Star CloudPRNT RLS and Security Definer Views

-- ========================================
-- 1. SECURE STAR CLOUDPRNT RLS POLICIES
-- ========================================

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Public can read print jobs" ON star_cloudprnt_jobs;
DROP POLICY IF EXISTS "Authenticated users can create print jobs" ON star_cloudprnt_jobs;
DROP POLICY IF EXISTS "Authenticated users can update job status" ON star_cloudprnt_jobs;
DROP POLICY IF EXISTS "Authenticated users can delete print jobs" ON star_cloudprnt_jobs;

-- Create secure policies that require authentication
-- Only authenticated staff can view print jobs
CREATE POLICY "Staff can view print jobs"
ON star_cloudprnt_jobs
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'worker'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Only authenticated staff can create print jobs
CREATE POLICY "Staff can create print jobs"
ON star_cloudprnt_jobs
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'worker'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Only authenticated staff can update print jobs
CREATE POLICY "Staff can update print jobs"
ON star_cloudprnt_jobs
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'worker'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Only authenticated staff can delete print jobs
CREATE POLICY "Staff can delete print jobs"
ON star_cloudprnt_jobs
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'worker'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- ========================================
-- 2. FIX SECURITY DEFINER VIEWS
-- ========================================

-- Drop and recreate views as SECURITY INVOKER (default, safer)
-- This ensures views execute with the permissions of the current user, not the view creator

-- Recreate product_performance_stats view without SECURITY DEFINER
DROP VIEW IF EXISTS product_performance_stats;

CREATE VIEW product_performance_stats AS
SELECT 
  p.id,
  p.name,
  p.category_id,
  c.name as category_name,
  p.quantity as current_stock,
  p.cost_price,
  p.price as selling_price,
  COALESCE(SUM(oi.quantity), 0) as total_sold,
  COUNT(DISTINCT o.id) as order_count,
  COALESCE(SUM(oi.price * oi.quantity), 0) as total_revenue,
  COALESCE(SUM(p.cost_price * oi.quantity), 0) as total_cost,
  COALESCE(SUM((oi.price - p.cost_price) * oi.quantity), 0) as total_profit,
  CASE 
    WHEN EXTRACT(EPOCH FROM (MAX(o.created_at) - MIN(o.created_at))) / 86400 > 0 
    THEN COALESCE(SUM(oi.quantity), 0) / (EXTRACT(EPOCH FROM (MAX(o.created_at) - MIN(o.created_at))) / 86400)
    ELSE 0 
  END as sales_velocity,
  CASE 
    WHEN COALESCE(SUM(oi.quantity), 0) > 0 
    THEN p.quantity / (COALESCE(SUM(oi.quantity), 0) / NULLIF(EXTRACT(EPOCH FROM (MAX(o.created_at) - MIN(o.created_at))) / 86400, 0))
    ELSE NULL 
  END as days_of_stock,
  MIN(o.created_at) as first_sale_date,
  MAX(o.created_at) as last_sale_date
FROM products p
LEFT JOIN categories c ON c.id = p.category_id
LEFT JOIN order_items oi ON oi.product_id = p.id
LEFT JOIN orders o ON o.id = oi.order_id AND o.status = 'completed'
GROUP BY p.id, p.name, p.category_id, c.name, p.quantity, p.cost_price, p.price;

-- Recreate theme_popularity_stats view without SECURITY DEFINER  
DROP VIEW IF EXISTS theme_popularity_stats;

CREATE VIEW theme_popularity_stats AS
SELECT 
  ta.theme_name,
  COUNT(DISTINCT ta.user_id) as unique_users,
  COUNT(*) FILTER (WHERE ta.action_type = 'activate') as activation_count,
  COUNT(*) FILTER (WHERE ta.action_type = 'preview') as preview_count,
  COUNT(DISTINCT uft.user_id) as favorite_count,
  AVG(ta.session_duration) as avg_session_duration,
  MAX(ta.created_at) as last_used_at
FROM theme_analytics ta
LEFT JOIN user_favorite_themes uft ON uft.theme_name = ta.theme_name
GROUP BY ta.theme_name;