-- Drop all triggers on weekly_balances
DROP TRIGGER IF EXISTS update_weekly_balance_payment_status ON public.weekly_balances;
DROP TRIGGER IF EXISTS update_weekly_balances_updated_at ON public.weekly_balances;
DROP TRIGGER IF EXISTS calculate_payment_status ON public.weekly_balances;

-- Recreate the updated_at trigger first
CREATE TRIGGER update_weekly_balances_updated_at
  BEFORE UPDATE ON public.weekly_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create a simplified payment status function without the RAISE NOTICE
CREATE OR REPLACE FUNCTION public.update_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Ensure all values are not null
  NEW.old_balance := COALESCE(NEW.old_balance, 0);
  NEW.total_balance := COALESCE(NEW.total_balance, 0);
  NEW.amount_paid := COALESCE(NEW.amount_paid, 0);
  
  -- Calculate remaining balance
  NEW.remaining_balance := (NEW.total_balance + NEW.old_balance) - NEW.amount_paid;
  
  -- Ensure remaining balance isn't negative
  IF NEW.remaining_balance < 0 THEN
    NEW.remaining_balance := 0;
  END IF;
  
  -- Determine payment status
  IF NEW.remaining_balance = 0 AND (NEW.total_balance + NEW.old_balance) > 0 THEN
    NEW.payment_status := 'paid_full';
  ELSIF NEW.amount_paid > 0 THEN
    NEW.payment_status := 'partial';
  ELSE
    NEW.payment_status := 'unpaid';
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create the payment status trigger
CREATE TRIGGER update_weekly_balance_payment_status
  BEFORE INSERT OR UPDATE ON public.weekly_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_status();

-- Force update to recalculate
UPDATE public.weekly_balances 
SET amount_paid = amount_paid;

-- Verify it worked
SELECT id, old_balance, total_balance, amount_paid, remaining_balance, payment_status
FROM weekly_balances 
ORDER BY updated_at DESC 
LIMIT 1;