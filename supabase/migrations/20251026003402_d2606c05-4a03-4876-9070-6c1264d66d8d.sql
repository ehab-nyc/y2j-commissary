-- Recreate the payment status function with correct logic
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
  
  RETURN NEW;
END;
$function$;

-- Force update all records
UPDATE public.weekly_balances 
SET updated_at = now();
