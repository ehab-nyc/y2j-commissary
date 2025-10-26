-- Drop the old trigger that only fires on specific column updates
DROP TRIGGER IF EXISTS calculate_payment_status ON public.weekly_balances;

-- Keep only the comprehensive trigger
-- (update_weekly_balance_payment_status already exists)

-- Now force a real update that will trigger recalculation
UPDATE public.weekly_balances 
SET commissary_rent = commissary_rent
WHERE TRUE;