-- Fix security issues in RLS policies

-- 1. Fix location_history: Only allow authenticated staff to insert location data
DROP POLICY IF EXISTS "System can insert location history" ON location_history;
DROP POLICY IF EXISTS "Authenticated users can insert location history" ON location_history;
CREATE POLICY "Authenticated staff can insert location history"
ON location_history
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'worker') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin')
);

-- 2. Fix geofence_alerts: Only allow authenticated staff to insert alerts
DROP POLICY IF EXISTS "System can insert geofence alerts" ON geofence_alerts;
DROP POLICY IF EXISTS "Authenticated staff can insert geofence alerts" ON geofence_alerts;
CREATE POLICY "Authenticated staff can create geofence alerts"
ON geofence_alerts
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'worker') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin')
);

-- 3. Restrict customer_phones visibility: Workers only see phones for customers with their assigned orders
DROP POLICY IF EXISTS "Staff can view all customer phone numbers" ON customer_phones;
DROP POLICY IF EXISTS "Staff can view relevant customer phone numbers" ON customer_phones;
CREATE POLICY "Staff can view need-to-know customer phone numbers"
ON customer_phones
FOR SELECT
TO authenticated
USING (
  -- Users can see their own phone numbers
  auth.uid() = customer_id
  OR
  -- Managers and admins can see all
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin')
  OR
  -- Workers can only see phones for customers with orders assigned to them or active orders
  (
    has_role(auth.uid(), 'worker') AND
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.customer_id = customer_phones.customer_id 
      AND (
        orders.assigned_worker_id = auth.uid() 
        OR orders.status IN ('pending', 'processing')
      )
    )
  )
);

-- 4. Create a server-side function to get non-super-admin profiles
CREATE OR REPLACE FUNCTION get_manageable_profiles()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  cart_name text,
  cart_number text,
  phone text,
  user_roles jsonb
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.email,
    p.full_name,
    p.cart_name,
    p.cart_number,
    p.phone,
    COALESCE(
      jsonb_agg(
        jsonb_build_object('role', ur.role)
      ) FILTER (WHERE ur.role IS NOT NULL),
      '[]'::jsonb
    ) as user_roles
  FROM profiles p
  LEFT JOIN user_roles ur ON ur.user_id = p.id
  WHERE NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = p.id 
    AND role = 'super_admin'
  )
  GROUP BY p.id, p.email, p.full_name, p.cart_name, p.cart_number, p.phone
  ORDER BY p.full_name;
$$;