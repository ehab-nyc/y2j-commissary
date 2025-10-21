-- Security Fix: Add box_size constraint for input validation
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'valid_box_size'
    ) THEN
        ALTER TABLE order_items 
        ADD CONSTRAINT valid_box_size 
        CHECK (box_size IN ('1 box', '1/2 box', '1/4 box'));
    END IF;
END $$;

-- Security Fix: Update triggers to use secure create_notification function
CREATE OR REPLACE FUNCTION public.notify_staff_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  staff_user RECORD;
  on_shift BOOLEAN;
  sms_message TEXT;
  supabase_url TEXT;
  supabase_key TEXT;
  customer_cart_name TEXT;
  customer_cart_number TEXT;
BEGIN
  -- Get customer cart information
  SELECT cart_name, cart_number 
  INTO customer_cart_name, customer_cart_number
  FROM profiles
  WHERE id = NEW.customer_id;
  
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
    
    -- Use secure create_notification function instead of direct INSERT
    PERFORM create_notification(
      staff_user.user_id,
      'new_order',
      'New order received from customer',
      NEW.id
    );
    
    -- Send SMS if user is on shift and has phone number
    IF on_shift AND staff_user.phone IS NOT NULL AND staff_user.phone != '' 
       AND supabase_url IS NOT NULL AND supabase_key IS NOT NULL THEN
      
      -- Build SMS message with cart info
      sms_message := 'New order alert! Order #' || SUBSTRING(NEW.id::text, 1, 8);
      
      IF customer_cart_name IS NOT NULL OR customer_cart_number IS NOT NULL THEN
        sms_message := sms_message || ' from ';
        IF customer_cart_name IS NOT NULL THEN
          sms_message := sms_message || customer_cart_name;
        END IF;
        IF customer_cart_number IS NOT NULL THEN
          IF customer_cart_name IS NOT NULL THEN
            sms_message := sms_message || ' (';
          END IF;
          sms_message := sms_message || '#' || customer_cart_number;
          IF customer_cart_name IS NOT NULL THEN
            sms_message := sms_message || ')';
          END IF;
        END IF;
      END IF;
      
      sms_message := sms_message || '. Please check the system.';
      
      -- Call the send-sms edge function with trigger secret
      PERFORM net.http_post(
        url := supabase_url || '/functions/v1/send-sms',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || supabase_key,
          'x-trigger-secret', COALESCE(current_setting('app.sms_trigger_secret', true), '')
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

CREATE OR REPLACE FUNCTION public.notify_customer_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  customer_profile RECORD;
  phone_record RECORD;
  sms_message TEXT;
  supabase_url TEXT;
  supabase_key TEXT;
BEGIN
  -- Only notify on status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get customer profile info
    SELECT p.full_name
    INTO customer_profile
    FROM profiles p
    WHERE p.id = NEW.customer_id;

    -- Notify customer when order is completed
    IF NEW.status = 'completed' THEN
      -- Use secure create_notification function instead of direct INSERT
      PERFORM create_notification(
        NEW.customer_id,
        'order_complete',
        'Your order has been completed!',
        NEW.id
      );

      -- Get Supabase configuration from settings
      SELECT value INTO supabase_url FROM system_settings WHERE key = 'supabase_url';
      SELECT value INTO supabase_key FROM system_settings WHERE key = 'supabase_anon_key';
      
      IF supabase_url IS NOT NULL AND supabase_key IS NOT NULL THEN
        sms_message := 'Hi ' || COALESCE(customer_profile.full_name, 'Customer') || 
                      '! Your order has been completed and is ready. Thank you for your business!';
        
        -- Send SMS to all customer phone numbers with trigger secret
        FOR phone_record IN 
          SELECT phone FROM customer_phones WHERE customer_id = NEW.customer_id
        LOOP
          PERFORM net.http_post(
            url := supabase_url || '/functions/v1/send-sms',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || supabase_key,
              'x-trigger-secret', COALESCE(current_setting('app.sms_trigger_secret', true), '')
            ),
            body := jsonb_build_object(
              'to', phone_record.phone,
              'message', sms_message
            )
          );
        END LOOP;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_low_stock()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  low_stock_product RECORD;
  manager_user RECORD;
BEGIN
  FOR low_stock_product IN 
    SELECT id, name, quantity, low_stock_threshold
    FROM products
    WHERE quantity <= low_stock_threshold
      AND active = true
  LOOP
    -- Notify all managers about low stock
    FOR manager_user IN 
      SELECT DISTINCT user_id 
      FROM user_roles 
      WHERE role IN ('manager', 'admin', 'super_admin')
    LOOP
      -- Check if notification already exists
      IF NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE user_id = manager_user.user_id
          AND type = 'low_stock'
          AND message LIKE '%' || low_stock_product.name || '%'
          AND read = false
      ) THEN
        -- Use secure create_notification function
        PERFORM create_notification(
          manager_user.user_id,
          'low_stock',
          'Low stock alert: ' || low_stock_product.name || ' (Quantity: ' || low_stock_product.quantity || ')',
          NULL
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trigger_check_low_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  manager_user RECORD;
BEGIN
  IF NEW.quantity <= NEW.low_stock_threshold AND NEW.active = true THEN
    FOR manager_user IN 
      SELECT DISTINCT user_id 
      FROM user_roles 
      WHERE role IN ('manager', 'admin', 'super_admin')
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE user_id = manager_user.user_id
          AND type = 'low_stock'
          AND message LIKE '%' || NEW.name || '%'
          AND read = false
      ) THEN
        -- Use secure create_notification function
        PERFORM create_notification(
          manager_user.user_id,
          'low_stock',
          'Low stock alert: ' || NEW.name || ' (Quantity: ' || NEW.quantity || ')',
          NULL
        );
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;