-- Add 'admin' back to the app_role enum (we now have both super_admin and admin)
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'admin';