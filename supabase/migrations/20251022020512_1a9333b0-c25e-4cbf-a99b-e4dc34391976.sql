-- Fix create_notification to allow system/trigger calls to notify staff about customer orders
CREATE OR REPLACE FUNCTION public.create_notification(p_user_id uuid, p_type text, p_message text, p_order_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_notification_id UUID;
  v_order_exists BOOLEAN;
  v_has_permission BOOLEAN;
BEGIN
  -- Validate notification type
  IF p_type NOT IN ('new_order', 'order_complete', 'low_stock', 'order_assigned') THEN
    RAISE EXCEPTION 'Invalid notification type: %', p_type;
  END IF;
  
  -- If order_id is provided, verify it exists
  IF p_order_id IS NOT NULL THEN
    SELECT EXISTS(SELECT 1 FROM orders WHERE id = p_order_id) INTO v_order_exists;
    
    IF NOT v_order_exists THEN
      RAISE EXCEPTION 'Order does not exist';
    END IF;
  END IF;
  
  -- Check caller has staff role OR is creating for themselves OR is a trigger (auth.uid() IS NULL)
  SELECT (
    auth.uid() IS NULL OR -- Allow triggers/system calls
    auth.uid() = p_user_id OR -- Allow users to create for themselves
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
$function$;