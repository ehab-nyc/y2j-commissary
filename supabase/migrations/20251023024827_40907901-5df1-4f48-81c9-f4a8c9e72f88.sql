-- Add phone number format validation constraints
-- This ensures phone numbers are validated server-side, not just client-side

-- Add constraint to customer_phones table
ALTER TABLE customer_phones
ADD CONSTRAINT valid_phone_format
CHECK (phone ~ '^\+?[1-9]\d{10,14}$');

-- Add constraint to profiles table for phone field
ALTER TABLE profiles
ADD CONSTRAINT valid_phone_format
CHECK (phone IS NULL OR phone ~ '^\+?[1-9]\d{10,14}$');

-- Add constraint to user_phone_numbers table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_phone_numbers') THEN
    ALTER TABLE user_phone_numbers
    ADD CONSTRAINT valid_phone_format
    CHECK (phone_number ~ '^\+?[1-9]\d{10,14}$');
  END IF;
END $$;