-- Add phone validation function
CREATE OR REPLACE FUNCTION public.validate_phone_format()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.phone IS NOT NULL AND NEW.phone !~ '^\+[1-9]\d{1,14}$' THEN
    RAISE EXCEPTION 'Phone must be in E.164 format (e.g., +1234567890)';
  END IF;
  RETURN NEW;
END;
$$;

-- Add validation trigger for customer_phones table
CREATE TRIGGER validate_customer_phone_format
BEFORE INSERT OR UPDATE ON public.customer_phones
FOR EACH ROW
EXECUTE FUNCTION public.validate_phone_format();

-- Add validation trigger for profiles table
CREATE TRIGGER validate_profile_phone_format
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.validate_phone_format();

-- Add validation trigger for user_phone_numbers table
CREATE TRIGGER validate_user_phone_format
BEFORE INSERT OR UPDATE ON public.user_phone_numbers
FOR EACH ROW
EXECUTE FUNCTION public.validate_phone_format();