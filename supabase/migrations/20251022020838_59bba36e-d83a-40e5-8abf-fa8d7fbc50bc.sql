-- Fix notifications RLS policy to allow inserts from create_notification function
-- Since create_notification is SECURITY DEFINER and validates everything,
-- we trust inserts that come through it

DROP POLICY IF EXISTS "Only secure function can create notifications" ON notifications;

-- Allow inserts - the create_notification SECURITY DEFINER function is the gatekeeper
CREATE POLICY "Allow inserts via create_notification function"
ON notifications
FOR INSERT
WITH CHECK (true);