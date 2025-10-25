-- Create cart_ownership table to link owners to customers
CREATE TABLE IF NOT EXISTS public.cart_ownership (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(owner_id, customer_id)
);

-- Create weekly_balances table
CREATE TABLE IF NOT EXISTS public.weekly_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  orders_total NUMERIC DEFAULT 0,
  franchise_fee NUMERIC DEFAULT 0,
  commissary_rent NUMERIC DEFAULT 0,
  total_balance NUMERIC GENERATED ALWAYS AS (orders_total + franchise_fee + commissary_rent) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(customer_id, week_start_date)
);

-- Enable RLS
ALTER TABLE public.cart_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_balances ENABLE ROW LEVEL SECURITY;

-- RLS Policies for cart_ownership
CREATE POLICY "Admins can manage cart ownership"
  ON public.cart_ownership FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Owners can view their assignments"
  ON public.cart_ownership FOR SELECT
  USING (has_role(auth.uid(), 'owner') AND owner_id = auth.uid());

CREATE POLICY "Customers can view their owner"
  ON public.cart_ownership FOR SELECT
  USING (has_role(auth.uid(), 'customer') AND customer_id = auth.uid());

-- RLS Policies for weekly_balances
CREATE POLICY "Admins can manage all balances"
  ON public.weekly_balances FOR ALL
  USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Owners can view their customers' balances"
  ON public.weekly_balances FOR SELECT
  USING (
    has_role(auth.uid(), 'owner') 
    AND EXISTS (
      SELECT 1 FROM public.cart_ownership 
      WHERE owner_id = auth.uid() AND customer_id = weekly_balances.customer_id
    )
  );

CREATE POLICY "Customers can view their own balances"
  ON public.weekly_balances FOR SELECT
  USING (has_role(auth.uid(), 'customer') AND customer_id = auth.uid());

-- Function to update or create weekly balance when order completes
CREATE OR REPLACE FUNCTION public.update_weekly_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start DATE;
  v_week_end DATE;
  v_total NUMERIC;
BEGIN
  -- Only process completed orders
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Calculate week start (Monday) and end (Sunday)
    v_week_start := date_trunc('week', NEW.updated_at)::date;
    v_week_end := v_week_start + INTERVAL '6 days';
    
    -- Calculate total for the week
    SELECT COALESCE(SUM(total), 0)
    INTO v_total
    FROM orders
    WHERE customer_id = NEW.customer_id
      AND status = 'completed'
      AND updated_at >= v_week_start
      AND updated_at <= v_week_end + INTERVAL '1 day';
    
    -- Insert or update weekly balance
    INSERT INTO weekly_balances (customer_id, week_start_date, week_end_date, orders_total)
    VALUES (NEW.customer_id, v_week_start, v_week_end, v_total)
    ON CONFLICT (customer_id, week_start_date)
    DO UPDATE SET 
      orders_total = v_total,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to update weekly balance on order completion
CREATE TRIGGER update_weekly_balance_on_order_complete
  AFTER INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_weekly_balance();

-- Add updated_at trigger for weekly_balances
CREATE TRIGGER update_weekly_balances_updated_at
  BEFORE UPDATE ON public.weekly_balances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check if user is owner of a customer
CREATE OR REPLACE FUNCTION public.is_owner_of_customer(_owner_id uuid, _customer_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cart_ownership
    WHERE owner_id = _owner_id AND customer_id = _customer_id
  )
$$;

-- Update orders RLS to allow owners to view their customers' orders
CREATE POLICY "Owners can view their customers' orders"
  ON public.orders FOR SELECT
  USING (
    has_role(auth.uid(), 'owner')
    AND EXISTS (
      SELECT 1 FROM public.cart_ownership
      WHERE owner_id = auth.uid() AND customer_id = orders.customer_id
    )
  );

-- Update profiles RLS to allow owners to view their customers' profiles
CREATE POLICY "Owners can view their customers' profiles"
  ON public.profiles FOR SELECT
  USING (
    has_role(auth.uid(), 'owner')
    AND EXISTS (
      SELECT 1 FROM public.cart_ownership
      WHERE owner_id = auth.uid() AND customer_id = profiles.id
    )
  );

-- Update order_items RLS to allow owners to view their customers' order items
CREATE POLICY "Owners can view their customers' order items"
  ON public.order_items FOR SELECT
  USING (
    has_role(auth.uid(), 'owner')
    AND EXISTS (
      SELECT 1 FROM orders o
      INNER JOIN cart_ownership co ON co.customer_id = o.customer_id
      WHERE co.owner_id = auth.uid() AND o.id = order_items.order_id
    )
  );

-- Update notifications to cascade to owners
CREATE OR REPLACE FUNCTION public.notify_customer_and_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner_record RECORD;
BEGIN
  -- Notify customer
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    PERFORM create_notification(
      NEW.customer_id,
      'order_complete',
      'Your order has been completed!',
      NEW.id
    );
    
    -- Notify all owners of this customer
    FOR owner_record IN 
      SELECT owner_id FROM cart_ownership WHERE customer_id = NEW.customer_id
    LOOP
      PERFORM create_notification(
        owner_record.owner_id,
        'order_complete',
        'Order completed for your customer',
        NEW.id
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Replace the old trigger
DROP TRIGGER IF EXISTS notify_customer_order_status ON public.orders;
CREATE TRIGGER notify_customer_and_owner_order_status
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_customer_and_owner();

-- Update staff notification to include owners
CREATE OR REPLACE FUNCTION public.notify_staff_and_owners_new_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  staff_user RECORD;
  owner_record RECORD;
BEGIN
  -- Notify staff (existing logic)
  FOR staff_user IN 
    SELECT DISTINCT ur.user_id
    FROM user_roles ur
    WHERE ur.role IN ('worker', 'manager', 'admin')
  LOOP
    PERFORM create_notification(
      staff_user.user_id,
      'new_order',
      'New order received from customer',
      NEW.id
    );
  END LOOP;
  
  -- Notify owners of this customer
  FOR owner_record IN 
    SELECT owner_id FROM cart_ownership WHERE customer_id = NEW.customer_id
  LOOP
    PERFORM create_notification(
      owner_record.owner_id,
      'new_order',
      'New order from your customer',
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$;

-- Replace the old trigger
DROP TRIGGER IF EXISTS notify_staff_new_order ON public.orders;
CREATE TRIGGER notify_staff_and_owners_new_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_staff_and_owners_new_order();