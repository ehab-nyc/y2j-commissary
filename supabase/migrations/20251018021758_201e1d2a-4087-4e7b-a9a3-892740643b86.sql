-- Add holiday_theme setting to app_settings if it doesn't exist
INSERT INTO app_settings (key, value)
VALUES ('holiday_theme', 'false')
ON CONFLICT (key) DO NOTHING;