-- Ensure products table has RLS enabled
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Add policy for staff to view all products
CREATE POLICY "Staff can view all products"
ON products
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'worker'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'customer'::app_role)
);