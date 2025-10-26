-- Temporarily drop the updated_at trigger to test
DROP TRIGGER IF EXISTS update_weekly_balances_updated_at ON public.weekly_balances;

-- Try a simple update
UPDATE public.weekly_balances 
SET remaining_balance = 3240.00
WHERE id = 'b00f82da-4043-4150-a167-8778363c78d5';

-- Check if it stuck
SELECT id, remaining_balance
FROM weekly_balances 
WHERE id = 'b00f82da-4043-4150-a167-8778363c78d5';