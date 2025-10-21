-- Fix function search_path issues by updating functions to have proper search_path
-- This addresses SUPA_function_search_path_mutable warning

-- Update update_updated_at_column function to have search_path set
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix notification RLS policy - Create controlled notification function
-- This addresses public_notification_access security issue

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_message TEXT,
  p_order_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_notification_id UUID;
  v_order_exists BOOLEAN;
  v_has_permission BOOLEAN;
BEGIN
  -- Validate notification type
  IF p_type NOT IN ('new_order', 'order_complete', 'low_stock', 'order_assigned') THEN
    RAISE EXCEPTION 'Invalid notification type: %', p_type;
  END IF;
  
  -- If order_id is provided, verify it exists and caller has access
  IF p_order_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1 FROM orders 
      WHERE id = p_order_id 
      AND (customer_id = p_user_id OR 
           assigned_worker_id = auth.uid() OR
           has_role(auth.uid(), 'worker') OR
           has_role(auth.uid(), 'manager') OR
           has_role(auth.uid(), 'admin') OR
           has_role(auth.uid(), 'super_admin'))
    ) INTO v_order_exists;
    
    IF NOT v_order_exists THEN
      RAISE EXCEPTION 'Invalid order or insufficient permissions';
    END IF;
  END IF;
  
  -- Check caller has staff role (or is system for triggers)
  SELECT (
    auth.uid() IS NULL OR -- Allow triggers/system calls
    has_role(auth.uid(), 'worker') OR 
    has_role(auth.uid(), 'manager') OR 
    has_role(auth.uid(), 'admin') OR
    has_role(auth.uid(), 'super_admin')
  ) INTO v_has_permission;
  
  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'Insufficient permissions to create notifications';
  END IF;
  
  -- Validate message length
  IF length(p_message) > 500 THEN
    RAISE EXCEPTION 'Message too long (max 500 characters)';
  END IF;
  
  -- Create validated notification
  INSERT INTO notifications (user_id, order_id, type, message)
  VALUES (p_user_id, p_order_id, p_type, p_message)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$;

-- Drop old unrestricted staff notification policy
DROP POLICY IF EXISTS "Staff can create notifications" ON notifications;

-- Create new restricted policy that only allows function-based creation
CREATE POLICY "System can create notifications via function"
ON notifications FOR INSERT
WITH CHECK (
  -- Only allow direct inserts from triggers (no auth.uid()) or via the secure function
  auth.uid() IS NULL OR
  has_role(auth.uid(), 'super_admin')
);