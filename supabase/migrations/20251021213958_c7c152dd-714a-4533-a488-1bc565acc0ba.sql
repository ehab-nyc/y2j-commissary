-- Update notify_staff_new_order to send SMS to staff on shift
CREATE OR REPLACE FUNCTION public.notify_staff_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  staff_user RECORD;
  staff_phone RECORD;
  on_shift BOOLEAN;
  sms_message TEXT;
  supabase_url TEXT;
  supabase_key TEXT;
BEGIN
  -- Get Supabase configuration
  SELECT value INTO supabase_url FROM system_settings WHERE key = 'supabase_url';
  SELECT value INTO supabase_key FROM system_settings WHERE key = 'supabase_anon_key';
  
  -- Notify all workers, managers, and admins about new order
  FOR staff_user IN 
    SELECT DISTINCT ur.user_id, p.phone, p.full_name
    FROM user_roles ur
    LEFT JOIN profiles p ON p.id = ur.user_id
    WHERE ur.role IN ('worker', 'manager', 'admin')
  LOOP
    -- Check if user is currently on shift
    on_shift := EXISTS (
      SELECT 1 
      FROM employee_shifts 
      WHERE employee_id = staff_user.user_id 
        AND clock_in <= NOW() 
        AND (clock_out IS NULL OR clock_out >= NOW())
    );
    
    -- Insert notification
    INSERT INTO notifications (user_id, order_id, type, message)
    VALUES (
      staff_user.user_id,
      NEW.id,
      'new_order',
      'New order received from customer'
    );
    
    -- Send SMS if user is on shift and has phone number
    IF on_shift AND staff_user.phone IS NOT NULL AND staff_user.phone != '' 
       AND supabase_url IS NOT NULL AND supabase_key IS NOT NULL THEN
      
      sms_message := 'New order alert! Order #' || SUBSTRING(NEW.id::text, 1, 8) || 
                    ' has been placed. Please check the system.';
      
      -- Call the send-sms edge function asynchronously
      PERFORM net.http_post(
        url := supabase_url || '/functions/v1/send-sms',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || supabase_key
        ),
        body := jsonb_build_object(
          'to', staff_user.phone,
          'message', sms_message
        )
      );
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$function$;