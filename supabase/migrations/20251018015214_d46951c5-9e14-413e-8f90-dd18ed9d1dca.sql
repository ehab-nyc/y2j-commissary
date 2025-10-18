-- Update RLS policies to allow 'admin' role alongside 'super_admin'

-- Categories: Allow admin to manage
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" 
ON public.categories 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Products: Allow admin to manage
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" 
ON public.products 
FOR ALL 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Orders: Allow admin to delete
DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;
CREATE POLICY "Admins can delete orders" 
ON public.orders 
FOR DELETE 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Violations: Allow admin to delete
DROP POLICY IF EXISTS "Admins can delete violations" ON public.violations;
CREATE POLICY "Admins can delete violations" 
ON public.violations 
FOR DELETE 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Violation Images: Allow admin to delete
DROP POLICY IF EXISTS "Admins can delete violation images" ON public.violation_images;
CREATE POLICY "Admins can delete violation images" 
ON public.violation_images 
FOR DELETE 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));