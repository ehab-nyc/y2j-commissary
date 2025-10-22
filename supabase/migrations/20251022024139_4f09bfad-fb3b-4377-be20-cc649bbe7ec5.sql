-- Store SMS trigger secret in system_settings so database functions can access it
INSERT INTO system_settings (key, value)
VALUES ('sms_trigger_secret', 'your_secret_key_here')
ON CONFLICT (key) DO UPDATE SET value = 'your_secret_key_here';

-- Update the send_order_completion_sms function to get secret from system_settings
CREATE OR REPLACE FUNCTION public.send_order_completion_sms()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  customer_phone TEXT;
  customer_name TEXT;
  order_total NUMERIC;
  supabase_url TEXT;
  supabase_key TEXT;
  trigger_secret TEXT;
BEGIN
  -- Only send SMS when status changes to completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get customer phone number (primary phone first)
    SELECT phone_number INTO customer_phone
    FROM public.user_phone_numbers
    WHERE user_id = NEW.customer_id AND is_primary = true
    LIMIT 1;
    
    -- If no primary phone, get any phone
    IF customer_phone IS NULL THEN
      SELECT phone_number INTO customer_phone
      FROM public.user_phone_numbers
      WHERE user_id = NEW.customer_id
      LIMIT 1;
    END IF;
    
    -- Get customer name and order total
    SELECT full_name INTO customer_name
    FROM public.profiles
    WHERE id = NEW.customer_id;
    
    order_total := NEW.total;
    
    -- Get Supabase configuration from system_settings
    SELECT value INTO supabase_url FROM system_settings WHERE key = 'supabase_url';
    SELECT value INTO supabase_key FROM system_settings WHERE key = 'supabase_anon_key';
    SELECT value INTO trigger_secret FROM system_settings WHERE key = 'sms_trigger_secret';
    
    -- Log for debugging
    RAISE NOTICE 'SMS Debug - Phone: %, URL: %, Secret exists: %', customer_phone, supabase_url, (trigger_secret IS NOT NULL);
    
    -- If customer has a phone number, send SMS
    IF customer_phone IS NOT NULL AND supabase_url IS NOT NULL AND supabase_key IS NOT NULL AND trigger_secret IS NOT NULL THEN
      -- Call the send-sms edge function with trigger secret
      PERFORM net.http_post(
        url := supabase_url || '/functions/v1/send-sms',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || supabase_key,
          'x-trigger-secret', trigger_secret
        ),
        body := jsonb_build_object(
          'to', customer_phone,
          'message', 'Hi ' || COALESCE(customer_name, 'Customer') || '! Your order #' || LEFT(NEW.id::TEXT, 8) || ' for $' || order_total || ' is ready for pickup!'
        )
      );
      
      RAISE NOTICE 'SMS sent to %', customer_phone;
    ELSE
      RAISE NOTICE 'SMS not sent - Missing data: phone=%, url=%, key=%, secret=%', 
        (customer_phone IS NOT NULL), (supabase_url IS NOT NULL), (supabase_key IS NOT NULL), (trigger_secret IS NOT NULL);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;