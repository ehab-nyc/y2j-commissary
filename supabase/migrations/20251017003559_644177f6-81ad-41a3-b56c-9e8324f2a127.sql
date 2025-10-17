-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS recalculate_order_total_trigger ON orders;
DROP FUNCTION IF EXISTS recalculate_order_total();

-- Create new function that preserves service fee
CREATE OR REPLACE FUNCTION public.recalculate_order_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  items_subtotal NUMERIC := 0;
  service_fee_value NUMERIC := 0;
BEGIN
  -- Get service fee from settings
  SELECT COALESCE(value::numeric, 0)
  INTO service_fee_value
  FROM app_settings
  WHERE key = 'service_fee';
  
  -- Sum all order items (with server-validated prices)
  SELECT COALESCE(SUM(price * quantity), 0)
  INTO items_subtotal
  FROM order_items
  WHERE order_id = NEW.id;
  
  -- Set total as items subtotal + service fee
  NEW.total := items_subtotal + service_fee_value;
  
  RETURN NEW;
END;
$function$;

-- Recreate the trigger
CREATE TRIGGER recalculate_order_total_trigger
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION recalculate_order_total();