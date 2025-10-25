-- Add franchise_fee and commissary_rent to app_settings
INSERT INTO app_settings (key, value)
VALUES 
  ('franchise_fee', '0.00'),
  ('commissary_rent', '0.00')
ON CONFLICT (key) DO NOTHING;

-- Update the weekly balance function to pull fees from app_settings and calculate total
CREATE OR REPLACE FUNCTION public.update_weekly_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start DATE;
  v_week_end DATE;
  v_total NUMERIC;
  v_franchise_fee NUMERIC;
  v_commissary_rent NUMERIC;
  v_total_balance NUMERIC;
BEGIN
  -- Only process completed orders
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Calculate week start (Monday) and end (Sunday)
    v_week_start := date_trunc('week', NEW.updated_at)::date;
    v_week_end := v_week_start + INTERVAL '6 days';
    
    -- Get franchise fee and commissary rent from settings
    SELECT COALESCE(value::numeric, 0)
    INTO v_franchise_fee
    FROM app_settings
    WHERE key = 'franchise_fee';
    
    SELECT COALESCE(value::numeric, 0)
    INTO v_commissary_rent
    FROM app_settings
    WHERE key = 'commissary_rent';
    
    -- Calculate total for the week
    SELECT COALESCE(SUM(total), 0)
    INTO v_total
    FROM orders
    WHERE customer_id = NEW.customer_id
      AND status = 'completed'
      AND updated_at >= v_week_start
      AND updated_at <= v_week_end + INTERVAL '1 day';
    
    -- Calculate total balance (orders_total - franchise_fee - commissary_rent)
    v_total_balance := v_total - v_franchise_fee - v_commissary_rent;
    
    -- Insert or update weekly balance
    INSERT INTO weekly_balances (
      customer_id, 
      week_start_date, 
      week_end_date, 
      orders_total,
      franchise_fee,
      commissary_rent,
      total_balance
    )
    VALUES (
      NEW.customer_id, 
      v_week_start, 
      v_week_end, 
      v_total,
      v_franchise_fee,
      v_commissary_rent,
      v_total_balance
    )
    ON CONFLICT (customer_id, week_start_date)
    DO UPDATE SET 
      orders_total = v_total,
      franchise_fee = v_franchise_fee,
      commissary_rent = v_commissary_rent,
      total_balance = v_total_balance,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;