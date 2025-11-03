-- Make violation-images bucket private for enhanced security
UPDATE storage.buckets
SET public = false
WHERE id = 'violation-images';

-- Remove Twilio credentials from app_settings table (moving to environment variables only)
DELETE FROM app_settings
WHERE key IN ('twilio_account_sid', 'twilio_auth_token', 'twilio_phone_number');