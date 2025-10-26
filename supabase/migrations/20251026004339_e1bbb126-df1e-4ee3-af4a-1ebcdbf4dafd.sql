-- Drop the payment status trigger
DROP TRIGGER IF EXISTS update_weekly_balance_payment_status ON public.weekly_balances;

-- Try direct update without any triggers
UPDATE public.weekly_balances 
SET remaining_balance = 3240.00
WHERE id = 'b00f82da-4043-4150-a167-8778363c78d5';

-- Check
SELECT id, remaining_balance
FROM weekly_balances 
WHERE id = 'b00f82da-4043-4150-a167-8778363c78d5';