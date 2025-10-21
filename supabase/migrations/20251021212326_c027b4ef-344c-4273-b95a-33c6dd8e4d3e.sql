-- Enable pg_net extension if not already enabled (required for http_post)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a system_settings table to store configuration
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS but allow the function to access it
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow system access
CREATE POLICY "System can access settings"
ON public.system_settings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Insert the Supabase configuration
INSERT INTO public.system_settings (key, value)
VALUES 
  ('supabase_url', 'https://jscmqiktfesaggpdeegk.supabase.co'),
  ('supabase_anon_key', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzY21xaWt0ZmVzYWdncGRlZWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyODk0ODAsImV4cCI6MjA3NTg2NTQ4MH0.Q8U91YGTWuW8n8f_biyLnTj6Km3IxhYndo6JWBfAzsM')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Update the notify_customer_order_status function to send SMS using system_settings
CREATE OR REPLACE FUNCTION public.notify_customer_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  customer_profile RECORD;
  sms_message TEXT;
  supabase_url TEXT;
  supabase_key TEXT;
BEGIN
  -- Only notify on status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Get customer profile info
    SELECT p.phone, p.sms_notifications, p.full_name
    INTO customer_profile
    FROM profiles p
    WHERE p.id = NEW.customer_id;

    -- Notify customer when order is completed
    IF NEW.status = 'completed' THEN
      INSERT INTO notifications (user_id, order_id, type, message)
      VALUES (
        NEW.customer_id,
        NEW.id,
        'order_complete',
        'Your order has been completed!'
      );

      -- Send SMS if enabled and phone number exists
      IF customer_profile.sms_notifications AND customer_profile.phone IS NOT NULL THEN
        -- Get Supabase configuration from settings
        SELECT value INTO supabase_url FROM system_settings WHERE key = 'supabase_url';
        SELECT value INTO supabase_key FROM system_settings WHERE key = 'supabase_anon_key';
        
        sms_message := 'Hi ' || COALESCE(customer_profile.full_name, 'Customer') || 
                      '! Your order has been completed and is ready. Thank you for your business!';
        
        -- Call the send-sms edge function asynchronously
        PERFORM net.http_post(
          url := supabase_url || '/functions/v1/send-sms',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || supabase_key
          ),
          body := jsonb_build_object(
            'to', customer_profile.phone,
            'message', sms_message
          )
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;