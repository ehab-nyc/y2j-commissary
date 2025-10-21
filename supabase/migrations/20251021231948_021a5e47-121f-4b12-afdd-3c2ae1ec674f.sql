-- Fix notifications table INSERT policy to prevent unauthorized notification creation
-- Drop the insecure policy that allows direct inserts
DROP POLICY IF EXISTS "System can create notifications via function" ON public.notifications;

-- Create secure policy that blocks all direct inserts
-- All notification creation must go through the secure create_notification() function
CREATE POLICY "Only secure function can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (false);

-- The existing create_notification() SECURITY DEFINER function will handle all inserts
-- It validates: notification type, permissions, message length, order_id existence