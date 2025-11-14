-- Insert Gold Diamond theme into themes table if it doesn't already exist
INSERT INTO themes (name, is_system)
VALUES ('gold-diamond', true)
ON CONFLICT (name) DO NOTHING;