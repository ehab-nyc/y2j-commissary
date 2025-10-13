-- Add box_size column to order_items table
ALTER TABLE public.order_items 
ADD COLUMN box_size text DEFAULT '1 box';