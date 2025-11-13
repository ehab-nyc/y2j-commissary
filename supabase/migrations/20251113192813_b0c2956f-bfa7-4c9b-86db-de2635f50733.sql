-- Add font_family and print_margin columns to receipt_templates table
ALTER TABLE receipt_templates 
ADD COLUMN font_family TEXT DEFAULT 'Courier New, monospace',
ADD COLUMN print_margin NUMERIC DEFAULT 1.6 CHECK (print_margin >= 0 AND print_margin <= 5);