-- Update RLS policy to include admin role for viewing violations
DROP POLICY IF EXISTS "Staff can view all violations" ON violations;

CREATE POLICY "Staff can view all violations" 
ON violations 
FOR SELECT 
USING (
  has_role(auth.uid(), 'worker'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Also update the policy for viewing violation images
DROP POLICY IF EXISTS "Anyone can view violation images if they can see the violation" ON violation_images;

CREATE POLICY "Anyone can view violation images if they can see the violation" 
ON violation_images 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM violations
    WHERE violations.id = violation_images.violation_id
    AND (
      violations.customer_id = auth.uid() OR
      has_role(auth.uid(), 'worker'::app_role) OR
      has_role(auth.uid(), 'manager'::app_role) OR
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'super_admin'::app_role)
    )
  )
);