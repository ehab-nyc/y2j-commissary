-- Update profiles SELECT policy to include admin role
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;

CREATE POLICY "Staff can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'worker'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Update orders SELECT policy to include admin role
DROP POLICY IF EXISTS "Customers can view their own orders" ON public.orders;

CREATE POLICY "Customers can view their own orders" 
ON public.orders 
FOR SELECT 
USING (
  (customer_id = auth.uid()) 
  OR has_role(auth.uid(), 'worker'::app_role) 
  OR has_role(auth.uid(), 'manager'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Update order_items SELECT policy to include admin role
DROP POLICY IF EXISTS "Users can view order items for orders they can see" ON public.order_items;

CREATE POLICY "Users can view order items for orders they can see" 
ON public.order_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1
    FROM orders
    WHERE orders.id = order_items.order_id 
    AND (
      orders.customer_id = auth.uid() 
      OR has_role(auth.uid(), 'worker'::app_role) 
      OR has_role(auth.uid(), 'manager'::app_role) 
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
    )
  )
);