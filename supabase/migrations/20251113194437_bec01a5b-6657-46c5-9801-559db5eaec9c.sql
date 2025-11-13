-- Add logo_size column to receipt_templates table
ALTER TABLE receipt_templates 
ADD COLUMN logo_size integer DEFAULT 100 CHECK (logo_size >= 50 AND logo_size <= 150);