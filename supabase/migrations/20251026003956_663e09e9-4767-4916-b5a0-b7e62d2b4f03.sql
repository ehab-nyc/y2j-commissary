-- Test if trigger fires on direct update
UPDATE public.weekly_balances 
SET amount_paid = 721.0
WHERE id = 'b00f82da-4043-4150-a167-8778363c78d5';

-- Check result
SELECT id, amount_paid, remaining_balance, payment_status
FROM weekly_balances
WHERE id = 'b00f82da-4043-4150-a167-8778363c78d5';