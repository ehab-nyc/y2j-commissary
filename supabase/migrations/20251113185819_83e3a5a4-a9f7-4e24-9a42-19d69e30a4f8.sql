-- Add text_size column to receipt_templates table
ALTER TABLE receipt_templates 
ADD COLUMN text_size INTEGER DEFAULT 12 CHECK (text_size >= 8 AND text_size <= 24);