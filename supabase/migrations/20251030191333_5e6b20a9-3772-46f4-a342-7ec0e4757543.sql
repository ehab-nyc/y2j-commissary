-- Fix 1: Make violation-images bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'violation-images';

-- Fix 2: Remove overly permissive profile viewing policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Fix 3: Add proper validation to get_user_cart_number function
CREATE OR REPLACE FUNCTION public.get_user_cart_number(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Only allow querying own cart or if staff/admin/owner
  IF _user_id != auth.uid() 
     AND NOT has_role(auth.uid(), 'worker'::app_role)
     AND NOT has_role(auth.uid(), 'manager'::app_role)
     AND NOT has_role(auth.uid(), 'admin'::app_role)
     AND NOT has_role(auth.uid(), 'super_admin'::app_role)
     AND NOT has_role(auth.uid(), 'owner'::app_role) THEN
    RETURN NULL;
  END IF;
  
  RETURN (SELECT cart_number FROM public.profiles WHERE id = _user_id);
END;
$function$;