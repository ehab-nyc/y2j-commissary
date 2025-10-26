-- Fix the existing records that were incorrectly marked as paid_full
UPDATE weekly_balances 
SET 
  remaining_balance = (COALESCE(total_balance, 0) + COALESCE(old_balance, 0)) - COALESCE(amount_paid, 0),
  payment_status = CASE 
    WHEN COALESCE(amount_paid, 0) >= (COALESCE(total_balance, 0) + COALESCE(old_balance, 0)) THEN 'paid_full'
    WHEN COALESCE(amount_paid, 0) > 0 THEN 'partial'
    ELSE 'unpaid'
  END
WHERE (COALESCE(total_balance, 0) + COALESCE(old_balance, 0)) - COALESCE(amount_paid, 0) != COALESCE(remaining_balance, 0);