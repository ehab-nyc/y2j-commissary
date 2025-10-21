-- Create receipt templates table
CREATE TABLE IF NOT EXISTS receipt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  header_text TEXT,
  footer_text TEXT,
  show_logo BOOLEAN DEFAULT true,
  show_company_info BOOLEAN DEFAULT true,
  show_barcode BOOLEAN DEFAULT false,
  paper_width INTEGER DEFAULT 80, -- in mm
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE receipt_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage receipt templates"
ON receipt_templates FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Everyone can view receipt templates"
ON receipt_templates FOR SELECT
USING (true);

-- Insert default template
INSERT INTO receipt_templates (name, is_default, header_text, footer_text, show_logo, show_company_info)
VALUES (
  'Default Receipt',
  true,
  'Thank you for your order!',
  'Please come again!',
  true,
  true
) ON CONFLICT DO NOTHING;

-- Add receipt-related settings to app_settings
INSERT INTO app_settings (key, value) 
VALUES 
  ('receipt_logo_url', ''),
  ('receipt_company_address', ''),
  ('receipt_company_phone', ''),
  ('receipt_tax_id', '')
ON CONFLICT (key) DO NOTHING;

-- Create index
CREATE INDEX IF NOT EXISTS idx_receipt_templates_default ON receipt_templates(is_default) WHERE is_default = true;