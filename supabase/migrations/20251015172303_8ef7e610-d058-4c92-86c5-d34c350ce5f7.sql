-- Add cart name and cart number to profiles table
ALTER TABLE public.profiles 
ADD COLUMN cart_name text,
ADD COLUMN cart_number text;