-- Create product_variants table for SKU management
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL UNIQUE,
  variant_name TEXT NOT NULL, -- e.g., "1 box", "1/2 box", "1/4 box"
  price NUMERIC NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  barcode TEXT,
  cost_price NUMERIC,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX idx_product_variants_sku ON public.product_variants(sku);
CREATE INDEX idx_product_variants_barcode ON public.product_variants(barcode) WHERE barcode IS NOT NULL;

-- Create inventory_forecasts table for AI predictions
CREATE TABLE IF NOT EXISTS public.inventory_forecasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  predicted_demand NUMERIC NOT NULL, -- units per week
  reorder_suggestion INTEGER, -- suggested reorder quantity
  confidence_score NUMERIC NOT NULL DEFAULT 0.5, -- 0 to 1
  forecast_date DATE NOT NULL DEFAULT CURRENT_DATE,
  days_until_stockout INTEGER, -- predicted days until out of stock
  trend TEXT, -- 'increasing', 'stable', 'decreasing'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_inventory_forecasts_product_id ON public.inventory_forecasts(product_id);
CREATE INDEX idx_inventory_forecasts_forecast_date ON public.inventory_forecasts(forecast_date);

-- Enable RLS on product_variants
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- RLS policies for product_variants
CREATE POLICY "Everyone can view active product variants"
  ON public.product_variants
  FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'worker'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can manage product variants"
  ON public.product_variants
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Enable RLS on inventory_forecasts
ALTER TABLE public.inventory_forecasts ENABLE ROW LEVEL SECURITY;

-- RLS policies for inventory_forecasts
CREATE POLICY "Staff can view inventory forecasts"
  ON public.inventory_forecasts
  FOR SELECT
  USING (has_role(auth.uid(), 'worker'::app_role) OR has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "System can manage inventory forecasts"
  ON public.inventory_forecasts
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Add trigger for updated_at on product_variants
CREATE TRIGGER update_product_variants_updated_at
  BEFORE UPDATE ON public.product_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on inventory_forecasts
CREATE TRIGGER update_inventory_forecasts_updated_at
  BEFORE UPDATE ON public.inventory_forecasts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();