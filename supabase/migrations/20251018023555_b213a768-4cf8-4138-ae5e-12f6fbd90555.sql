-- Update app_settings to use theme names instead of boolean
UPDATE app_settings 
SET key = 'active_theme', 
    value = CASE 
      WHEN value = 'true' THEN 'christmas'
      ELSE 'default'
    END
WHERE key = 'holiday_theme';

-- Insert active_theme setting if it doesn't exist
INSERT INTO app_settings (key, value)
SELECT 'active_theme', 'default'
WHERE NOT EXISTS (
  SELECT 1 FROM app_settings WHERE key = 'active_theme'
);