-- Fix overly permissive notification creation policy
-- Drop the insecure policy that allows any user to create notifications
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;

-- Create a new policy that only allows staff to create notifications
CREATE POLICY "Staff can create notifications"
ON public.notifications
FOR INSERT
TO public
WITH CHECK (
  has_role(auth.uid(), 'worker'::app_role) OR
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);