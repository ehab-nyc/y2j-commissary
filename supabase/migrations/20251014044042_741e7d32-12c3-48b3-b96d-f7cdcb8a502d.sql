-- Drop the trigger first
DROP TRIGGER IF EXISTS notify_customer_on_status_change ON orders;

-- Drop and recreate the function with correct enum values
DROP FUNCTION IF EXISTS public.notify_customer_order_status();

CREATE OR REPLACE FUNCTION public.notify_customer_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only notify on status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify customer when order is completed
    IF NEW.status = 'completed' THEN
      INSERT INTO notifications (user_id, order_id, type, message)
      VALUES (
        NEW.customer_id,
        NEW.id,
        'order_complete',
        'Your order has been completed!'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER notify_customer_on_status_change
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION notify_customer_order_status();