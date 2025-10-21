-- Add inventory management columns to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS barcode TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS reorder_point INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS reorder_quantity INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS supplier_name TEXT;

-- Create purchase orders table
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  received_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view all purchase orders"
ON purchase_orders FOR SELECT
USING (has_role(auth.uid(), 'worker'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Managers can create purchase orders"
ON purchase_orders FOR INSERT
WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Managers can update purchase orders"
ON purchase_orders FOR UPDATE
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Create purchase order items table
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  cost_price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view purchase order items"
ON purchase_order_items FOR SELECT
USING (has_role(auth.uid(), 'worker'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Managers can manage purchase order items"
ON purchase_order_items FOR ALL
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Create stock takes table
CREATE TABLE IF NOT EXISTS stock_takes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

ALTER TABLE stock_takes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view stock takes"
ON stock_takes FOR SELECT
USING (has_role(auth.uid(), 'worker'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Staff can create stock takes"
ON stock_takes FOR INSERT
WITH CHECK (has_role(auth.uid(), 'worker'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Staff can update stock takes"
ON stock_takes FOR UPDATE
USING (has_role(auth.uid(), 'worker'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Create stock take items table
CREATE TABLE IF NOT EXISTS stock_take_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_take_id UUID NOT NULL REFERENCES stock_takes(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  expected_quantity INTEGER NOT NULL,
  actual_quantity INTEGER,
  variance INTEGER GENERATED ALWAYS AS (actual_quantity - expected_quantity) STORED,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE stock_take_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view stock take items"
ON stock_take_items FOR SELECT
USING (has_role(auth.uid(), 'worker'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Staff can manage stock take items"
ON stock_take_items FOR ALL
USING (has_role(auth.uid(), 'worker'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Add customer management fields to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS customer_tier TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS total_spent NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS sms_notifications BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;

-- Create employee shifts table
CREATE TABLE IF NOT EXISTS employee_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES auth.users(id),
  clock_in TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  clock_out TIMESTAMP WITH TIME ZONE,
  hours_worked NUMERIC GENERATED ALWAYS AS (
    CASE 
      WHEN clock_out IS NOT NULL 
      THEN EXTRACT(EPOCH FROM (clock_out - clock_in)) / 3600
      ELSE NULL
    END
  ) STORED,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE employee_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view their own shifts"
ON employee_shifts FOR SELECT
USING (auth.uid() = employee_id OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Employees can clock in/out"
ON employee_shifts FOR INSERT
WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Employees can update their shifts"
ON employee_shifts FOR UPDATE
USING (auth.uid() = employee_id OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Managers can manage all shifts"
ON employee_shifts FOR ALL
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Create trigger to update customer total_spent when order is completed
CREATE OR REPLACE FUNCTION update_customer_total_spent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE profiles
    SET total_spent = total_spent + NEW.total,
        loyalty_points = loyalty_points + FLOOR(NEW.total)
    WHERE id = NEW.customer_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_customer_total_spent_trigger
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_customer_total_spent();

-- Create function to check low stock and create notifications
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  low_stock_product RECORD;
  manager_user RECORD;
BEGIN
  FOR low_stock_product IN 
    SELECT id, name, quantity, low_stock_threshold
    FROM products
    WHERE quantity <= low_stock_threshold
      AND active = true
  LOOP
    -- Notify all managers about low stock
    FOR manager_user IN 
      SELECT DISTINCT user_id 
      FROM user_roles 
      WHERE role IN ('manager', 'admin', 'super_admin')
    LOOP
      -- Check if notification already exists
      IF NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE user_id = manager_user.user_id
          AND type = 'low_stock'
          AND message LIKE '%' || low_stock_product.name || '%'
          AND read = false
      ) THEN
        INSERT INTO notifications (user_id, type, message, order_id)
        VALUES (
          manager_user.user_id,
          'low_stock',
          'Low stock alert: ' || low_stock_product.name || ' (Quantity: ' || low_stock_product.quantity || ')',
          NULL
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- Create trigger to check low stock after product quantity update
CREATE OR REPLACE FUNCTION trigger_check_low_stock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  manager_user RECORD;
BEGIN
  IF NEW.quantity <= NEW.low_stock_threshold AND NEW.active = true THEN
    FOR manager_user IN 
      SELECT DISTINCT user_id 
      FROM user_roles 
      WHERE role IN ('manager', 'admin', 'super_admin')
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM notifications
        WHERE user_id = manager_user.user_id
          AND type = 'low_stock'
          AND message LIKE '%' || NEW.name || '%'
          AND read = false
      ) THEN
        INSERT INTO notifications (user_id, type, message, order_id)
        VALUES (
          manager_user.user_id,
          'low_stock',
          'Low stock alert: ' || NEW.name || ' (Quantity: ' || NEW.quantity || ')',
          NULL
        );
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER low_stock_notification_trigger
AFTER UPDATE OF quantity ON products
FOR EACH ROW
EXECUTE FUNCTION trigger_check_low_stock();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_stock_takes_status ON stock_takes(status);
CREATE INDEX IF NOT EXISTS idx_employee_shifts_employee ON employee_shifts(employee_id);
CREATE INDEX IF NOT EXISTS idx_profiles_customer_tier ON profiles(customer_tier);