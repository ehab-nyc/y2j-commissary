-- Create returns table for tracking product returns
CREATE TABLE IF NOT EXISTS public.returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  processed_by UUID NOT NULL REFERENCES public.profiles(id),
  return_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reason TEXT NOT NULL,
  total_refund NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT returns_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'completed'))
);

-- Create return_items table for individual items being returned
CREATE TABLE IF NOT EXISTS public.return_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_id UUID NOT NULL REFERENCES public.returns(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity_returned INTEGER NOT NULL CHECK (quantity_returned > 0),
  price_per_unit NUMERIC NOT NULL,
  restock BOOLEAN NOT NULL DEFAULT true,
  condition TEXT NOT NULL DEFAULT 'good',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT return_items_condition_check CHECK (condition IN ('good', 'damaged', 'defective'))
);

-- Create product_performance view for analytics
CREATE OR REPLACE VIEW public.product_performance_stats AS
SELECT 
  p.id,
  p.name,
  p.category_id,
  c.name as category_name,
  p.quantity as current_stock,
  p.cost_price,
  p.price as selling_price,
  COALESCE(SUM(oi.quantity), 0) as total_sold,
  COALESCE(COUNT(DISTINCT o.id), 0) as order_count,
  COALESCE(SUM(oi.quantity * oi.price), 0) as total_revenue,
  COALESCE(SUM(oi.quantity * p.cost_price), 0) as total_cost,
  COALESCE(SUM(oi.quantity * oi.price) - SUM(oi.quantity * p.cost_price), 0) as total_profit,
  CASE 
    WHEN COALESCE(SUM(oi.quantity), 0) = 0 THEN 0
    ELSE COALESCE(SUM(oi.quantity), 0) / NULLIF(EXTRACT(DAY FROM (NOW() - MIN(o.created_at))), 0)
  END as sales_velocity,
  CASE 
    WHEN COALESCE(SUM(oi.quantity), 0) / NULLIF(EXTRACT(DAY FROM (NOW() - MIN(o.created_at))), 0) = 0 THEN NULL
    ELSE p.quantity / NULLIF((COALESCE(SUM(oi.quantity), 0) / NULLIF(EXTRACT(DAY FROM (NOW() - MIN(o.created_at))), 0)), 0)
  END as days_of_stock,
  MIN(o.created_at) as first_sale_date,
  MAX(o.created_at) as last_sale_date
FROM public.products p
LEFT JOIN public.categories c ON c.id = p.category_id
LEFT JOIN public.order_items oi ON oi.product_id = p.id
LEFT JOIN public.orders o ON o.id = oi.order_id AND o.status = 'completed'
WHERE p.active = true
GROUP BY p.id, p.name, p.category_id, c.name, p.quantity, p.cost_price, p.price;

-- Create backups metadata table
CREATE TABLE IF NOT EXISTS public.backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  backup_type TEXT NOT NULL DEFAULT 'manual',
  tables_included TEXT[] NOT NULL,
  file_size_bytes BIGINT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  CONSTRAINT backup_type_check CHECK (backup_type IN ('manual', 'automatic', 'scheduled')),
  CONSTRAINT backup_status_check CHECK (status IN ('pending', 'in_progress', 'completed', 'failed'))
);

-- Create SMS notification templates table
CREATE TABLE IF NOT EXISTS public.sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  template_key TEXT NOT NULL UNIQUE,
  message_template TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Insert default SMS templates
INSERT INTO public.sms_templates (name, template_key, message_template) VALUES
  ('Order Completed', 'order_completed', 'Hi {{customer_name}}! Your order #{{order_id}} for ${{total}} is ready for pickup!'),
  ('Order Ready', 'order_ready', 'Hi {{customer_name}}! Your order #{{order_id}} is ready for pickup. Thank you!'),
  ('Order Processing', 'order_processing', 'Hi {{customer_name}}! Your order #{{order_id}} is now being processed.'),
  ('Low Stock Alert', 'low_stock_alert', 'Low stock alert: {{product_name}} has only {{quantity}} units remaining.'),
  ('Balance Reminder', 'balance_reminder', 'Hi {{customer_name}}! Your weekly balance is ${{balance}}. Payment due by {{due_date}}.')
ON CONFLICT (template_key) DO NOTHING;

-- Function to restore inventory when return is approved
CREATE OR REPLACE FUNCTION public.restore_inventory_on_return()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only restore inventory when return is approved and items should be restocked
  IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
    -- Update product quantities for restocked items
    UPDATE public.products p
    SET quantity = p.quantity + ri.quantity_returned
    FROM public.return_items ri
    WHERE ri.return_id = NEW.id 
      AND ri.product_id = p.id 
      AND ri.restock = true
      AND ri.condition IN ('good', 'damaged');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger to restore inventory
CREATE TRIGGER trigger_restore_inventory
AFTER UPDATE ON public.returns
FOR EACH ROW
EXECUTE FUNCTION public.restore_inventory_on_return();

-- Enable RLS on new tables
ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for returns
CREATE POLICY "Staff can view all returns"
ON public.returns FOR SELECT
USING (
  has_role(auth.uid(), 'worker'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Staff can create returns"
ON public.returns FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'worker'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Staff can update returns"
ON public.returns FOR UPDATE
USING (
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- RLS Policies for return_items
CREATE POLICY "Staff can view return items"
ON public.return_items FOR SELECT
USING (
  has_role(auth.uid(), 'worker'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Staff can manage return items"
ON public.return_items FOR ALL
USING (
  has_role(auth.uid(), 'worker'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- RLS Policies for backup_logs
CREATE POLICY "Admins can view backups"
ON public.backup_logs FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins can create backups"
ON public.backup_logs FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- RLS Policies for sms_templates
CREATE POLICY "Staff can view SMS templates"
ON public.sms_templates FOR SELECT
USING (
  has_role(auth.uid(), 'worker'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE POLICY "Admins can manage SMS templates"
ON public.sms_templates FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);