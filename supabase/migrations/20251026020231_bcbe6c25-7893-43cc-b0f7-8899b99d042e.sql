-- Update rollover function to delete from weekly_balances and create snapshot
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
  
  -- Only rollover if record exists
  IF v_current_balance.id IS NOT NULL THEN
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
    
    -- Only create next week if there's remaining balance
    IF v_current_balance.remaining_balance > 0 THEN
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
    
    -- Delete the current week from weekly_balances (move to history)
    DELETE FROM weekly_balances
    WHERE customer_id = p_customer_id
      AND week_start_date = p_current_week_start;
  END IF;
END;
$function$;