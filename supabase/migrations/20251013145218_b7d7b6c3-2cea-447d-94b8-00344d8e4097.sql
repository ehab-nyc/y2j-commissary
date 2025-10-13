-- Fix profiles table RLS policy to prevent public data exposure
-- Drop the permissive policy that allows viewing all profiles
DROP POLICY "Users can view all profiles" ON public.profiles;

-- Allow users to view only their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow staff roles to view all profiles for legitimate business needs
CREATE POLICY "Staff can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'worker'::app_role) OR 
    public.has_role(auth.uid(), 'manager'::app_role) OR 
    public.has_role(auth.uid(), 'admin'::app_role)
  );