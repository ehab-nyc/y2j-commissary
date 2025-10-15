-- Add company address and email to app_settings
INSERT INTO app_settings (key, value) 
VALUES 
  ('company_address', '3512 19th Ave, Astoria, NY 11102'),
  ('company_email', 'Info@y2jnyc.com')
ON CONFLICT (key) DO UPDATE 
SET value = EXCLUDED.value;