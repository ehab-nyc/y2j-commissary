-- Fix 1: Tighten customer_phones RLS policy to restrict workers to only their assigned orders
DROP POLICY IF EXISTS "Staff can view need-to-know customer phone numbers" ON public.customer_phones;

CREATE POLICY "Workers view assigned customer phones"
ON public.customer_phones
FOR SELECT
USING (
  auth.uid() = customer_id OR
  has_role(auth.uid(), 'manager'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role) OR
  -- Workers can only see phone numbers for orders assigned to them
  (has_role(auth.uid(), 'worker'::app_role) AND EXISTS (
    SELECT 1 FROM orders
    WHERE orders.customer_id = customer_phones.customer_id
      AND orders.assigned_worker_id = auth.uid()
  ))
);

-- Fix 2: Tighten notifications INSERT policy for defense-in-depth
-- Remove permissive INSERT policy and replace with restrictive one
DROP POLICY IF EXISTS "Allow inserts via create_notification function" ON public.notifications;

CREATE POLICY "Only system can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (false);

-- Note: The create_notification SECURITY DEFINER function will still work
-- because SECURITY DEFINER functions bypass RLS policies