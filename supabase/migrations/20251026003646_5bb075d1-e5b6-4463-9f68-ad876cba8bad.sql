-- Temporarily disable the trigger to manually fix the data
DROP TRIGGER IF EXISTS update_weekly_balance_payment_status ON public.weekly_balances;

-- Manually update all records with correct calculations
UPDATE public.weekly_balances 
SET 
  remaining_balance = (COALESCE(total_balance, 0) + COALESCE(old_balance, 0)) - COALESCE(amount_paid, 0),
  payment_status = CASE 
    WHEN COALESCE(amount_paid, 0) >= (COALESCE(total_balance, 0) + COALESCE(old_balance, 0)) 
      AND (COALESCE(total_balance, 0) + COALESCE(old_balance, 0)) > 0 THEN 'paid_full'::text
    WHEN COALESCE(amount_paid, 0) > 0 THEN 'partial'::text
    ELSE 'unpaid'::text
  END;

-- Recreate the trigger
CREATE TRIGGER update_weekly_balance_payment_status
  BEFORE INSERT OR UPDATE ON public.weekly_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_status();