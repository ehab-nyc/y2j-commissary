-- Add category column to receipt_templates
ALTER TABLE receipt_templates 
ADD COLUMN category TEXT DEFAULT 'other' CHECK (category IN ('retail', 'restaurant', 'service', 'other'));