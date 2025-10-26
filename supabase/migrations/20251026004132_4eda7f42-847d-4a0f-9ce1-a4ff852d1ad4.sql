-- Let me test if the function works at all by calling it directly
DO $$
DECLARE
  test_record weekly_balances%ROWTYPE;
  result_record weekly_balances%ROWTYPE;
BEGIN
  -- Get a test record
  SELECT * INTO test_record FROM weekly_balances WHERE id = 'b00f82da-4043-4150-a167-8778363c78d5';
  
  -- Simulate the trigger
  test_record.old_balance := COALESCE(test_record.old_balance, 0);
  test_record.total_balance := COALESCE(test_record.total_balance, 0);
  test_record.amount_paid := COALESCE(test_record.amount_paid, 0);
  test_record.remaining_balance := (test_record.total_balance + test_record.old_balance) - test_record.amount_paid;
  
  IF test_record.remaining_balance < 0 THEN
    test_record.remaining_balance := 0;
  END IF;
  
  IF test_record.remaining_balance = 0 AND (test_record.total_balance + test_record.old_balance) > 0 THEN
    test_record.payment_status := 'paid_full';
  ELSIF test_record.amount_paid > 0 THEN
    test_record.payment_status := 'partial';
  ELSE
    test_record.payment_status := 'unpaid';
  END IF;
  
  RAISE NOTICE 'Calculated: remaining_balance=%, payment_status=%', test_record.remaining_balance, test_record.payment_status;
END $$;