-- Create weekly_balance_history table
CREATE TABLE IF NOT EXISTS public.weekly_balance_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  week_start_date date NOT NULL,
  week_end_date date NOT NULL,
  orders_total numeric NOT NULL DEFAULT 0,
  franchise_fee numeric NOT NULL DEFAULT 0,
  commissary_rent numeric NOT NULL DEFAULT 0,
  old_balance numeric NOT NULL DEFAULT 0,
  total_balance numeric GENERATED ALWAYS AS (orders_total + franchise_fee + commissary_rent + old_balance) STORED,
  amount_paid numeric NOT NULL DEFAULT 0,
  remaining_balance numeric NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'unpaid',
  rolled_over_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.weekly_balance_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for weekly_balance_history
CREATE POLICY "Admins can view balance history"
ON public.weekly_balance_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

CREATE POLICY "System can insert balance history"
ON public.weekly_balance_history
FOR INSERT
WITH CHECK (true);

-- Update rollover function to move to history
CREATE OR REPLACE FUNCTION public.rollover_unpaid_balance(p_customer_id uuid, p_current_week_start date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_current_balance RECORD;
  v_next_week_start date;
  v_next_week_end date;
BEGIN
  -- Get current week's balance record
  SELECT * INTO v_current_balance
  FROM weekly_balances
  WHERE customer_id = p_customer_id
    AND week_start_date = p_current_week_start;
  
  -- Only rollover if there's a remaining balance and record exists
  IF v_current_balance.remaining_balance > 0 THEN
    -- Move current balance to history
    INSERT INTO weekly_balance_history (
      customer_id,
      week_start_date,
      week_end_date,
      orders_total,
      franchise_fee,
      commissary_rent,
      old_balance,
      amount_paid,
      remaining_balance,
      payment_status
    )
    VALUES (
      v_current_balance.customer_id,
      v_current_balance.week_start_date,
      v_current_balance.week_end_date,
      v_current_balance.orders_total,
      v_current_balance.franchise_fee,
      v_current_balance.commissary_rent,
      v_current_balance.old_balance,
      v_current_balance.amount_paid,
      v_current_balance.remaining_balance,
      v_current_balance.payment_status
    );
    
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
      commissary_rent
    )
    VALUES (
      p_customer_id,
      v_next_week_start,
      v_next_week_end,
      v_current_balance.remaining_balance,
      0,
      0,
      0
    )
    ON CONFLICT (customer_id, week_start_date)
    DO UPDATE SET
      old_balance = v_current_balance.remaining_balance,
      updated_at = now();
  END IF;
END;
$function$;