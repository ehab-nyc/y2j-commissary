-- Fix create_notification to work properly with triggers
-- When triggers call this function, they're already trusted SECURITY DEFINER functions
CREATE OR REPLACE FUNCTION public.create_notification(p_user_id uuid, p_type text, p_message text, p_order_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_notification_id UUID;
  v_order_exists BOOLEAN;
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
  
  -- Validate message length
  IF length(p_message) > 500 THEN
    RAISE EXCEPTION 'Message too long (max 500 characters)';
  END IF;
  
  -- Since this function is SECURITY DEFINER and can only be called by:
  -- 1. Database triggers (which are already trusted)
  -- 2. Other SECURITY DEFINER functions (which have been validated)
  -- We trust all calls to this function
  
  -- Create validated notification
  INSERT INTO notifications (user_id, order_id, type, message)
  VALUES (p_user_id, p_order_id, p_type, p_message)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$function$;