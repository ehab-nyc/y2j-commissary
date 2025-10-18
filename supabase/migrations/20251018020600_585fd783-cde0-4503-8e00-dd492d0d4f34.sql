-- Create a security definer function to get customer profiles
-- This bypasses RLS since staff need to see customer profiles for violations
CREATE OR REPLACE FUNCTION public.get_customer_profiles()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  cart_name text,
  cart_number text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.email, p.cart_name, p.cart_number
  FROM profiles p
  INNER JOIN user_roles ur ON ur.user_id = p.id
  WHERE ur.role = 'customer'
  ORDER BY p.full_name;
$$;