-- Migrate existing products to product_variants system
-- Create variants for each product based on their box_sizes

DO $$
DECLARE
  product_record RECORD;
  box_size TEXT;
  price_multiplier NUMERIC;
  variant_quantity INTEGER;
  sku_suffix TEXT;
BEGIN
  -- Loop through all active products
  FOR product_record IN 
    SELECT id, name, price, quantity, box_sizes, barcode
    FROM products
    WHERE active = true
  LOOP
    -- If product has box_sizes defined, create those variants
    IF product_record.box_sizes IS NOT NULL AND array_length(product_record.box_sizes, 1) > 0 THEN
      FOREACH box_size IN ARRAY product_record.box_sizes
      LOOP
        -- Determine price multiplier and SKU suffix
        CASE box_size
          WHEN '1 box' THEN
            price_multiplier := 1.0;
            sku_suffix := '1BOX';
            -- Assign all quantity to the '1 box' variant
            variant_quantity := product_record.quantity;
          WHEN '1/2 box' THEN
            price_multiplier := 0.5;
            sku_suffix := 'HALFBOX';
            variant_quantity := 0;
          WHEN '1/4 box' THEN
            price_multiplier := 0.25;
            sku_suffix := 'QUARTERBOX';
            variant_quantity := 0;
          ELSE
            price_multiplier := 1.0;
            sku_suffix := 'CUSTOM';
            variant_quantity := 0;
        END CASE;

        -- Insert variant
        INSERT INTO product_variants (
          product_id,
          variant_name,
          sku,
          price,
          quantity,
          barcode,
          is_active
        ) VALUES (
          product_record.id,
          box_size,
          UPPER(REPLACE(product_record.name, ' ', '-')) || '-' || sku_suffix,
          product_record.price * price_multiplier,
          variant_quantity,
          CASE 
            WHEN box_size = '1 box' THEN product_record.barcode 
            ELSE NULL 
          END,
          true
        );
      END LOOP;
    ELSE
      -- If no box_sizes defined, create a default '1 box' variant
      INSERT INTO product_variants (
        product_id,
        variant_name,
        sku,
        price,
        quantity,
        barcode,
        is_active
      ) VALUES (
        product_record.id,
        '1 box',
        UPPER(REPLACE(product_record.name, ' ', '-')) || '-1BOX',
        product_record.price,
        product_record.quantity,
        product_record.barcode,
        true
      );
    END IF;
  END LOOP;
END $$;

-- Add comment to track migration
COMMENT ON TABLE product_variants IS 'Product variants migrated from products table with box_sizes split into individual SKUs';