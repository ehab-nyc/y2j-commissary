-- Create violations table
CREATE TABLE public.violations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  inspector_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cart_name TEXT,
  cart_number TEXT,
  violation_type TEXT NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'resolved', 'dismissed')),
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Staff can create violations"
ON public.violations
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'worker'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Staff can view all violations"
ON public.violations
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'worker'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Customers can view their own violations"
ON public.violations
FOR SELECT
TO authenticated
USING (customer_id = auth.uid());

CREATE POLICY "Staff can update violations"
ON public.violations
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'worker'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'worker'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete violations"
ON public.violations
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create violation_images table
CREATE TABLE public.violation_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  violation_id UUID NOT NULL REFERENCES public.violations(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.violation_images ENABLE ROW LEVEL SECURITY;

-- Create policies for images
CREATE POLICY "Staff can create violation images"
ON public.violation_images
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'worker'::app_role) OR 
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Anyone can view violation images if they can see the violation"
ON public.violation_images
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.violations
    WHERE violations.id = violation_images.violation_id
    AND (
      customer_id = auth.uid() OR
      has_role(auth.uid(), 'worker'::app_role) OR 
      has_role(auth.uid(), 'manager'::app_role) OR 
      has_role(auth.uid(), 'admin'::app_role)
    )
  )
);

CREATE POLICY "Admins can delete violation images"
ON public.violation_images
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for violation images
INSERT INTO storage.buckets (id, name, public)
VALUES ('violation-images', 'violation-images', true);

-- Create storage policies
CREATE POLICY "Staff can upload violation images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'violation-images' AND
  (
    has_role(auth.uid(), 'worker'::app_role) OR 
    has_role(auth.uid(), 'manager'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  )
);

CREATE POLICY "Anyone can view violation images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'violation-images');

CREATE POLICY "Admins can delete violation images from storage"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'violation-images' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Trigger to update updated_at
CREATE TRIGGER update_violations_updated_at
BEFORE UPDATE ON public.violations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();