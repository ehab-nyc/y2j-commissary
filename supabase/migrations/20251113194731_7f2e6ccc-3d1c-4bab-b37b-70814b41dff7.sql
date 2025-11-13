-- Add logo_position column to receipt_templates table
ALTER TABLE receipt_templates 
ADD COLUMN logo_position text DEFAULT 'center' CHECK (logo_position IN ('left', 'center', 'right'));