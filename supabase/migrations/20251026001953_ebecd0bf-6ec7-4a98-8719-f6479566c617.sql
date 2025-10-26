-- Create trigger to automatically update payment status and remaining balance
CREATE TRIGGER update_weekly_balance_payment_status
  BEFORE INSERT OR UPDATE ON public.weekly_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_status();