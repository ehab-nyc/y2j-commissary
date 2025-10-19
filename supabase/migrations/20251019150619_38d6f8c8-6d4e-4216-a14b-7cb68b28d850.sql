-- Enable realtime updates for app_settings table so theme changes propagate to all users
ALTER PUBLICATION supabase_realtime ADD TABLE app_settings;