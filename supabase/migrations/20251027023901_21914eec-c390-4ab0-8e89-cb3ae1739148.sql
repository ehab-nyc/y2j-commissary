-- Add halloween-minimal theme to themes table
INSERT INTO themes (name, is_system)
VALUES ('halloween-minimal', true)
ON CONFLICT (name) DO NOTHING;