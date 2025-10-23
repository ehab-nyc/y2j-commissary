-- Fix the role_change_audit table to allow NULL for changed_by during system operations
-- This allows the audit trail to work during user signup when there's no authenticated context

ALTER TABLE role_change_audit 
ALTER COLUMN changed_by DROP NOT NULL;

-- Update the audit_role_change function to handle NULL changed_by
CREATE OR REPLACE FUNCTION public.audit_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO role_change_audit (user_id, old_role, new_role, changed_by)
  VALUES (
    COALESCE(NEW.user_id, OLD.user_id),
    OLD.role,
    NEW.role,
    auth.uid()  -- This will be NULL during signup, which is now allowed
  );
  RETURN NEW;
END;
$function$;