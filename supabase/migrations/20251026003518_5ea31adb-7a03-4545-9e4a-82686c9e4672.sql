-- Add logging to debug the trigger
CREATE OR REPLACE FUNCTION public.update_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  total_due NUMERIC;
BEGIN
  -- Ensure all values are not null
  NEW.old_balance := COALESCE(NEW.old_balance, 0);
  NEW.total_balance := COALESCE(NEW.total_balance, 0);
  NEW.amount_paid := COALESCE(NEW.amount_paid, 0);
  
  -- Calculate total due
  total_due := NEW.total_balance + NEW.old_balance;
  
  -- Calculate remaining balance
  NEW.remaining_balance := total_due - NEW.amount_paid;
  
  -- Log for debugging
  RAISE NOTICE 'Payment Status Update: total_due=%, amount_paid=%, remaining_balance=%', 
    total_due, NEW.amount_paid, NEW.remaining_balance;
  
  -- Ensure remaining balance isn't negative
  IF NEW.remaining_balance < 0 THEN
    NEW.remaining_balance := 0;
  END IF;
  
  -- Determine payment status based on remaining balance
  IF NEW.remaining_balance = 0 AND total_due > 0 THEN
    NEW.payment_status := 'paid_full';
  ELSIF NEW.amount_paid > 0 THEN
    NEW.payment_status := 'partial';
  ELSE
    NEW.payment_status := 'unpaid';
  END IF;
  
  RAISE NOTICE 'Final: status=%, remaining=%', NEW.payment_status, NEW.remaining_balance;
  
  RETURN NEW;
END;
$function$;

-- Test with a specific update
UPDATE public.weekly_balances 
SET amount_paid = 501.5
WHERE id = 'b00f82da-4043-4150-a167-8778363c78d5';