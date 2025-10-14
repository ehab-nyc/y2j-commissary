-- Function to recalculate order item prices from database
CREATE OR REPLACE FUNCTION recalculate_order_item_price()
RETURNS TRIGGER AS $$
DECLARE
  product_price NUMERIC;
  multiplier NUMERIC := 1;
BEGIN
  -- Get current product price from database (source of truth)
  SELECT price INTO product_price
  FROM products
  WHERE id = NEW.product_id;
  
  IF product_price IS NULL THEN
    RAISE EXCEPTION 'Product not found';
  END IF;
  
  -- Apply box size multiplier
  IF NEW.box_size = '1/2 box' THEN
    multiplier := 0.5;
  ELSIF NEW.box_size = '1/4 box' THEN
    multiplier := 0.25;
  ELSIF NEW.box_size = '1 box' THEN
    multiplier := 1;
  ELSE
    RAISE EXCEPTION 'Invalid box size: %', NEW.box_size;
  END IF;
  
  -- OVERRIDE client-provided price with server-calculated price
  NEW.price := product_price * multiplier;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Trigger on INSERT/UPDATE to recalculate prices
CREATE TRIGGER recalculate_item_price_trigger
BEFORE INSERT OR UPDATE ON order_items
FOR EACH ROW
EXECUTE FUNCTION recalculate_order_item_price();

-- Function to recalculate order totals
CREATE OR REPLACE FUNCTION recalculate_order_total()
RETURNS TRIGGER AS $$
DECLARE
  calculated_total NUMERIC := 0;
BEGIN
  -- Sum all order items (with server-validated prices)
  SELECT COALESCE(SUM(price * quantity), 0)
  INTO calculated_total
  FROM order_items
  WHERE order_id = NEW.id;
  
  -- OVERRIDE client-provided total
  NEW.total := calculated_total;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Trigger to recalculate total after items inserted
CREATE TRIGGER recalculate_order_total_trigger
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION recalculate_order_total();

-- Also recalculate when items change
CREATE OR REPLACE FUNCTION update_order_total_after_items()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE orders
  SET updated_at = NOW()
  WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE TRIGGER update_order_total_on_item_change
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW
EXECUTE FUNCTION update_order_total_after_items();