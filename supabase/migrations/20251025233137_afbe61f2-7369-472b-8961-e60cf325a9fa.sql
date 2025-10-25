-- Add payment tracking columns to weekly_balances
ALTER TABLE weekly_balances
ADD COLUMN IF NOT EXISTS amount_paid numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS remaining_balance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS old_balance numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid_full'));

-- Update existing records to set remaining_balance = total_balance initially
UPDATE weekly_balances
SET remaining_balance = total_balance
WHERE remaining_balance = 0;

-- Function to calculate and update payment status
CREATE OR REPLACE FUNCTION update_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate remaining balance
  NEW.remaining_balance := (NEW.total_balance + NEW.old_balance) - NEW.amount_paid;
  
  -- Determine payment status
  IF NEW.amount_paid >= (NEW.total_balance + NEW.old_balance) THEN
    NEW.payment_status := 'paid_full';
    NEW.remaining_balance := 0;
  ELSIF NEW.amount_paid > 0 THEN
    NEW.payment_status := 'partial';
  ELSE
    NEW.payment_status := 'unpaid';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-calculate payment status
DROP TRIGGER IF EXISTS calculate_payment_status ON weekly_balances;
CREATE TRIGGER calculate_payment_status
BEFORE INSERT OR UPDATE OF amount_paid, total_balance, old_balance
ON weekly_balances
FOR EACH ROW
EXECUTE FUNCTION update_payment_status();

-- Function to rollover unpaid balances to next week
CREATE OR REPLACE FUNCTION rollover_unpaid_balance(
  p_customer_id uuid,
  p_current_week_start date
)
RETURNS void AS $$
DECLARE
  v_remaining_balance numeric;
  v_next_week_start date;
  v_next_week_end date;
BEGIN
  -- Get remaining balance from current week
  SELECT remaining_balance INTO v_remaining_balance
  FROM weekly_balances
  WHERE customer_id = p_customer_id
    AND week_start_date = p_current_week_start;
  
  -- Only rollover if there's a remaining balance
  IF v_remaining_balance > 0 THEN
    -- Calculate next week dates
    v_next_week_start := p_current_week_start + INTERVAL '7 days';
    v_next_week_end := v_next_week_start + INTERVAL '6 days';
    
    -- Insert or update next week's balance with old_balance
    INSERT INTO weekly_balances (
      customer_id,
      week_start_date,
      week_end_date,
      old_balance,
      orders_total,
      franchise_fee,
      commissary_rent,
      total_balance
    )
    VALUES (
      p_customer_id,
      v_next_week_start,
      v_next_week_end,
      v_remaining_balance,
      0,
      0,
      0,
      0
    )
    ON CONFLICT (customer_id, week_start_date)
    DO UPDATE SET
      old_balance = v_remaining_balance,
      updated_at = now();
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;