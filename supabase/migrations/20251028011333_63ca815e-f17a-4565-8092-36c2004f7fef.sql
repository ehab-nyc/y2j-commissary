-- Make customer_id nullable to allow manual customer entries
ALTER TABLE violations ALTER COLUMN customer_id DROP NOT NULL;

-- Add a manual_customer_name field for when customer_id is null
ALTER TABLE violations ADD COLUMN manual_customer_name text;