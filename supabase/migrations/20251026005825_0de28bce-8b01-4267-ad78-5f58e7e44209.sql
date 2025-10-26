-- Fix rollover_unpaid_balance function to not insert total_balance
CREATE OR REPLACE FUNCTION public.rollover_unpaid_balance(p_customer_id uuid, p_current_week_start date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    
    -- Insert or update next week's balance with old_balance (total_balance is auto-calculated)
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
      v_remaining_balance,
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
$function$;