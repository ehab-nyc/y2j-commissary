-- Enable realtime for violations table
ALTER PUBLICATION supabase_realtime ADD TABLE public.violations;

-- Enable realtime for violation_images table
ALTER PUBLICATION supabase_realtime ADD TABLE public.violation_images;