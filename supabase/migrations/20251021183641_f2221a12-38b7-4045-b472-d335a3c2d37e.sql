-- Add product active status check to price calculation trigger
CREATE OR REPLACE FUNCTION public.recalculate_order_item_price()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  product_price NUMERIC;
  product_active BOOLEAN;
  multiplier NUMERIC := 1;
BEGIN
  -- Strict validation: only allow known box sizes
  IF NEW.box_size NOT IN ('1 box', '1/2 box', '1/4 box') THEN
    RAISE EXCEPTION 'Invalid box size';
  END IF;
  
  -- Get current product price and active status from database (source of truth)
  SELECT price, active INTO product_price, product_active
  FROM products
  WHERE id = NEW.product_id;
  
  -- Validate product exists
  IF product_price IS NULL THEN
    RAISE EXCEPTION 'Invalid product';
  END IF;
  
  -- Check if product is active
  IF NOT product_active THEN
    RAISE EXCEPTION 'Product is not available for ordering';
  END IF;
  
  -- Validate price is positive
  IF product_price <= 0 THEN
    RAISE EXCEPTION 'Invalid product price';
  END IF;
  
  -- Apply box size multiplier
  IF NEW.box_size = '1/2 box' THEN
    multiplier := 0.5;
  ELSIF NEW.box_size = '1/4 box' THEN
    multiplier := 0.25;
  ELSIF NEW.box_size = '1 box' THEN
    multiplier := 1;
  END IF;
  
  -- OVERRIDE client-provided price with server-calculated price
  NEW.price := product_price * multiplier;
  
  RETURN NEW;
END;
$function$;