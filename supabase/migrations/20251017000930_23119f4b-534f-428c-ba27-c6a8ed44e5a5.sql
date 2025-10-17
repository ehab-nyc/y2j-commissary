-- Insert default service fee setting
INSERT INTO public.app_settings (key, value)
VALUES ('service_fee', '10')
ON CONFLICT (key) DO NOTHING;