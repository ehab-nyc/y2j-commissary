-- Ensure the trigger exists and is properly configured
DROP TRIGGER IF EXISTS update_weekly_balance_payment_status ON public.weekly_balances;

CREATE TRIGGER update_weekly_balance_payment_status
  BEFORE INSERT OR UPDATE ON public.weekly_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_status();

-- Force recalculation of all existing records
UPDATE public.weekly_balances 
SET amount_paid = amount_paid
WHERE TRUE;