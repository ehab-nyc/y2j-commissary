-- Drop the restrictive policy that's blocking workers
DROP POLICY IF EXISTS "Workers and managers can update orders" ON orders;

-- Create new policy that allows workers, managers, and admins to update all order fields
CREATE POLICY "Staff can update orders"
ON orders
FOR UPDATE
USING (
  has_role(auth.uid(), 'worker'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'worker'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);