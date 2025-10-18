-- Drop existing policy
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Create updated policy that allows both admin and super_admin to manage roles
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);