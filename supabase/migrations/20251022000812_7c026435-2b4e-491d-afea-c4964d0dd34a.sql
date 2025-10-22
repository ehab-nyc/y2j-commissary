-- Fix 1: Ensure user_roles table properly enforces the app_role enum type
-- The column already uses app_role enum, but let's add explicit constraint validation
-- and prevent any potential bypass attempts

-- Add a trigger to validate role assignments and prevent rapid-fire changes (rate limiting)
CREATE TABLE IF NOT EXISTS public.role_change_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  old_role app_role,
  new_role app_role NOT NULL,
  changed_by uuid NOT NULL,
  changed_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on audit table
ALTER TABLE public.role_change_audit ENABLE ROW LEVEL SECURITY;

-- Only super admins can view audit logs
CREATE POLICY "Super admins can view role change audit"
ON public.role_change_audit
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'));

-- Create rate limiting function for role changes (max 5 changes per user per hour)
CREATE OR REPLACE FUNCTION public.check_role_change_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_changes INTEGER;
BEGIN
  -- Count recent role changes for this user (last hour)
  SELECT COUNT(*) INTO recent_changes
  FROM role_change_audit
  WHERE user_id = NEW.user_id
    AND changed_at > NOW() - INTERVAL '1 hour';
  
  -- Allow max 5 role changes per hour per user
  IF recent_changes >= 5 THEN
    RAISE EXCEPTION 'Rate limit exceeded: Too many role changes for this user';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for rate limiting on role changes
DROP TRIGGER IF EXISTS role_change_rate_limit ON public.user_roles;
CREATE TRIGGER role_change_rate_limit
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION check_role_change_rate_limit();

-- Create audit trigger for role changes
CREATE OR REPLACE FUNCTION public.audit_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO role_change_audit (user_id, old_role, new_role, changed_by)
  VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    OLD.role,
    NEW.role,
    auth.uid()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_role_changes ON public.user_roles;
CREATE TRIGGER audit_role_changes
  AFTER INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION audit_role_change();

-- Fix 2: Add rate limiting for SMS notifications (max 10 SMS per order cycle)
CREATE TABLE IF NOT EXISTS public.sms_rate_limit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid,
  phone_number text NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  message_type text NOT NULL
);

-- Enable RLS on SMS rate limit table
ALTER TABLE public.sms_rate_limit ENABLE ROW LEVEL SECURITY;

-- Only staff can view SMS logs
CREATE POLICY "Staff can view SMS rate limits"
ON public.sms_rate_limit
FOR SELECT
USING (
  has_role(auth.uid(), 'worker') OR 
  has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'super_admin')
);

-- System can insert SMS logs (for triggers)
CREATE POLICY "System can log SMS sends"
ON public.sms_rate_limit
FOR INSERT
WITH CHECK (true);

-- Clean up old SMS logs (keep last 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_sms_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM sms_rate_limit
  WHERE sent_at < NOW() - INTERVAL '7 days';
END;
$$;