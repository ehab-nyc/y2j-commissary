-- Add paper_type column to receipt_templates table
ALTER TABLE receipt_templates 
ADD COLUMN paper_type TEXT DEFAULT 'thermal_80mm' CHECK (paper_type IN ('thermal_58mm', 'thermal_80mm', 'a4_paper'));

-- Update existing records to use thermal_80mm based on their current paper_width
UPDATE receipt_templates 
SET paper_type = CASE 
  WHEN paper_width <= 60 THEN 'thermal_58mm'
  WHEN paper_width <= 100 THEN 'thermal_80mm'
  ELSE 'a4_paper'
END;