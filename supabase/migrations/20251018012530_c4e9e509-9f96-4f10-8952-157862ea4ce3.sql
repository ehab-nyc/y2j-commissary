-- Rename 'admin' to 'super_admin' in the app_role enum
ALTER TYPE app_role RENAME VALUE 'admin' TO 'super_admin';