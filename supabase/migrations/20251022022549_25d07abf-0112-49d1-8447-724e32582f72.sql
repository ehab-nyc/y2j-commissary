-- Create user_phone_numbers table for SMS notifications
CREATE TABLE IF NOT EXISTS public.user_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  phone_number TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, phone_number)
);

-- Enable RLS
ALTER TABLE public.user_phone_numbers ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own phone numbers
CREATE POLICY "Users can view own phone numbers"
  ON public.user_phone_numbers
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own phone numbers"
  ON public.user_phone_numbers
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own phone numbers"
  ON public.user_phone_numbers
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to send SMS notification when order is completed
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
    
    -- If customer has a phone number, send SMS
    IF customer_phone IS NOT NULL AND supabase_url IS NOT NULL AND supabase_key IS NOT NULL THEN
      -- Call the send-sms edge function with trigger secret
      PERFORM net.http_post(
        url := supabase_url || '/functions/v1/send-sms',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || supabase_key,
          'x-trigger-secret', COALESCE(current_setting('app.sms_trigger_secret', true), '')
        ),
        body := jsonb_build_object(
          'to', customer_phone,
          'message', 'Hi ' || COALESCE(customer_name, 'Customer') || '! Your order #' || LEFT(NEW.id::TEXT, 8) || ' for $' || order_total || ' is ready for pickup!'
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for order completion SMS
DROP TRIGGER IF EXISTS send_sms_on_order_completion ON public.orders;
CREATE TRIGGER send_sms_on_order_completion
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.send_order_completion_sms();