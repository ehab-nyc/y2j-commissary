-- Fix profiles table RLS policy to prevent unauthorized profile viewing
-- Drop overly permissive policy if it exists
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Ensure the correct restrictive policies are in place
-- (These may already exist, using IF NOT EXISTS pattern)

-- Policy: Users can view their own profile
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile"
      ON public.profiles FOR SELECT
      USING (auth.uid() = id);
  END IF;
END $$;

-- Policy: Staff can view all profiles for business purposes
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
    AND policyname = 'Staff can view all profiles'
  ) THEN
    CREATE POLICY "Staff can view all profiles"
      ON public.profiles FOR SELECT
      USING (
        has_role(auth.uid(), 'worker'::app_role) OR 
        has_role(auth.uid(), 'manager'::app_role) OR 
        has_role(auth.uid(), 'admin'::app_role)
      );
  END IF;
END $$;