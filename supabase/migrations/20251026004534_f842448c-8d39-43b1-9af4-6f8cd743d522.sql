-- Fix all existing records
UPDATE public.weekly_balances 
SET remaining_balance = (COALESCE(total_balance, 0) + COALESCE(old_balance, 0)) - COALESCE(amount_paid, 0),
    payment_status = CASE 
      WHEN COALESCE(amount_paid, 0) >= (COALESCE(total_balance, 0) + COALESCE(old_balance, 0)) 
        AND (COALESCE(total_balance, 0) + COALESCE(old_balance, 0)) > 0 THEN 'paid_full'::text
      WHEN COALESCE(amount_paid, 0) > 0 THEN 'partial'::text
      ELSE 'unpaid'::text
    END;

-- Verify the fix
SELECT id, old_balance, total_balance, amount_paid, remaining_balance, payment_status
FROM weekly_balances 
ORDER BY updated_at DESC 
LIMIT 3;