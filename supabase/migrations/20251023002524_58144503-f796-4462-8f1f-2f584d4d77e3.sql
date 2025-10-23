-- Grant execute permission on get_manageable_profiles to authenticated users
GRANT EXECUTE ON FUNCTION public.get_manageable_profiles() TO authenticated;

-- Ensure managers can access user_roles for the function to work
-- The function already has SECURITY DEFINER so it bypasses RLS, but let's make sure