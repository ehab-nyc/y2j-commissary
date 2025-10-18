-- Drop existing policy for staff viewing profiles
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;

-- Recreate with same permissions
CREATE POLICY "Staff can view all profiles"
ON public.profiles
FOR SELECT
USING (
  has_role(auth.uid(), 'worker'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Add new policy to allow super_admin to update any profile
CREATE POLICY "Super admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'::app_role));