-- Create notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('new_order', 'order_ready', 'order_complete')),
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- System can create notifications (via triggers)
CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Function to notify staff about new orders
CREATE OR REPLACE FUNCTION public.notify_staff_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  staff_user RECORD;
BEGIN
  -- Notify all workers, managers, and admins about new order
  FOR staff_user IN 
    SELECT DISTINCT user_id 
    FROM user_roles 
    WHERE role IN ('worker', 'manager', 'admin')
  LOOP
    INSERT INTO notifications (user_id, order_id, type, message)
    VALUES (
      staff_user.user_id,
      NEW.id,
      'new_order',
      'New order received from customer'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Function to notify customer about order status changes
CREATE OR REPLACE FUNCTION public.notify_customer_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only notify on status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify customer when order is ready or complete
    IF NEW.status IN ('ready', 'complete') THEN
      INSERT INTO notifications (user_id, order_id, type, message)
      VALUES (
        NEW.customer_id,
        NEW.id,
        CASE 
          WHEN NEW.status = 'ready' THEN 'order_ready'
          WHEN NEW.status = 'complete' THEN 'order_complete'
        END,
        CASE 
          WHEN NEW.status = 'ready' THEN 'Your order is ready for pickup!'
          WHEN NEW.status = 'complete' THEN 'Your order has been completed!'
        END
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for new orders
CREATE TRIGGER notify_staff_on_new_order
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION notify_staff_new_order();

-- Trigger for order status updates
CREATE TRIGGER notify_customer_on_status_change
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION notify_customer_order_status();