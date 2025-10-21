-- Create customer_phones table for multiple phone numbers
CREATE TABLE IF NOT EXISTS public.customer_phones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(customer_id, phone)
);

-- Enable RLS
ALTER TABLE public.customer_phones ENABLE ROW LEVEL SECURITY;

-- Policies for customer_phones
CREATE POLICY "Users can view their own phone numbers"
ON public.customer_phones
FOR SELECT
USING (auth.uid() = customer_id);

CREATE POLICY "Users can insert their own phone numbers"
ON public.customer_phones
FOR INSERT
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Users can delete their own phone numbers"
ON public.customer_phones
FOR DELETE
USING (auth.uid() = customer_id);

CREATE POLICY "Staff can view all customer phone numbers"
ON public.customer_phones
FOR SELECT
USING (
  has_role(auth.uid(), 'worker') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin')
);

-- Update notify_customer_order_status to send SMS to all phone numbers
CREATE OR REPLACE FUNCTION public.notify_customer_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      INSERT INTO notifications (user_id, order_id, type, message)
      VALUES (
        NEW.customer_id,
        NEW.id,
        'order_complete',
        'Your order has been completed!'
      );

      -- Get Supabase configuration from settings
      SELECT value INTO supabase_url FROM system_settings WHERE key = 'supabase_url';
      SELECT value INTO supabase_key FROM system_settings WHERE key = 'supabase_anon_key';
      
      IF supabase_url IS NOT NULL AND supabase_key IS NOT NULL THEN
        sms_message := 'Hi ' || COALESCE(customer_profile.full_name, 'Customer') || 
                      '! Your order has been completed and is ready. Thank you for your business!';
        
        -- Send SMS to all customer phone numbers
        FOR phone_record IN 
          SELECT phone FROM customer_phones WHERE customer_id = NEW.customer_id
        LOOP
          PERFORM net.http_post(
            url := supabase_url || '/functions/v1/send-sms',
            headers := jsonb_build_object(
              'Content-Type', 'application/json',
              'Authorization', 'Bearer ' || supabase_key
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

-- Migrate existing phone numbers from profiles to customer_phones
INSERT INTO public.customer_phones (customer_id, phone, is_primary)
SELECT id, phone, true
FROM profiles
WHERE phone IS NOT NULL AND phone != ''
ON CONFLICT (customer_id, phone) DO NOTHING;