-- Drop existing trigger and recreate with correct logic
DROP TRIGGER IF EXISTS update_weekly_balance_payment_status ON public.weekly_balances;

-- Update the payment status function to ensure remaining_balance is always calculated
CREATE OR REPLACE FUNCTION public.update_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Ensure all values are not null for calculation
  NEW.old_balance := COALESCE(NEW.old_balance, 0);
  NEW.total_balance := COALESCE(NEW.total_balance, 0);
  NEW.amount_paid := COALESCE(NEW.amount_paid, 0);
  
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
$function$;

-- Recreate the trigger
CREATE TRIGGER update_weekly_balance_payment_status
  BEFORE INSERT OR UPDATE ON public.weekly_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_status();

-- Update existing records to calculate remaining balance
UPDATE weekly_balances 
SET remaining_balance = (COALESCE(total_balance, 0) + COALESCE(old_balance, 0)) - COALESCE(amount_paid, 0),
    payment_status = CASE 
      WHEN COALESCE(amount_paid, 0) >= (COALESCE(total_balance, 0) + COALESCE(old_balance, 0)) THEN 'paid_full'
      WHEN COALESCE(amount_paid, 0) > 0 THEN 'partial'
      ELSE 'unpaid'
    END
WHERE remaining_balance IS NULL OR remaining_balance = 0;