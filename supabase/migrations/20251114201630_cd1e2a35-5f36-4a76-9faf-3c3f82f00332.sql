-- Add colors column to themes table to store custom theme color configurations
ALTER TABLE themes ADD COLUMN IF NOT EXISTS colors jsonb DEFAULT NULL;

-- Add description column for custom themes
ALTER TABLE themes ADD COLUMN IF NOT EXISTS description text DEFAULT NULL;

COMMENT ON COLUMN themes.colors IS 'JSON object storing custom color values for the theme (HSL format)';
COMMENT ON COLUMN themes.description IS 'Optional description of the theme';