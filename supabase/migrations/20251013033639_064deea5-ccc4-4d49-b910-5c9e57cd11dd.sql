-- Add box_sizes column to products table
ALTER TABLE public.products 
ADD COLUMN box_sizes text[] DEFAULT ARRAY['1 box']::text[];

-- Add a comment to document the column
COMMENT ON COLUMN public.products.box_sizes IS 'Available box sizes for this product: 1 box, 1/2 box, 1/4 box';