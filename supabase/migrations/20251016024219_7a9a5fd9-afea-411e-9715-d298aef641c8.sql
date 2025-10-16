-- Create function to get user's cart number
CREATE OR REPLACE FUNCTION public.get_user_cart_number(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cart_number
  FROM public.profiles
  WHERE id = _user_id
$$;

-- Drop existing customer view policy
DROP POLICY IF EXISTS "Customers can view their own violations" ON public.violations;

-- Create new policy to allow customers to see all violations for their cart
CREATE POLICY "Customers can view violations for their cart"
ON public.violations
FOR SELECT
USING (
  -- Customer can see violations they were involved in
  customer_id = auth.uid()
  OR
  -- OR violations for their cart number (full cart history)
  (cart_number IS NOT NULL AND cart_number = public.get_user_cart_number(auth.uid()))
);