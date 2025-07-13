/*
  # Add barcode and QR code fields to products and inventory

  1. New Fields
    - Add `barcode` and `qr_code` fields to products table
    - Add `barcode` and `qr_code` fields to inventory table
    
  2. Indexes
    - Create indexes for efficient searching by barcode and QR code
*/

-- Add barcode and QR code fields to products table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'barcode'
  ) THEN
    ALTER TABLE products ADD COLUMN barcode text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'qr_code'
  ) THEN
    ALTER TABLE products ADD COLUMN qr_code text;
  END IF;
END $$;

-- Add barcode and QR code fields to inventory table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory' AND column_name = 'barcode'
  ) THEN
    ALTER TABLE inventory ADD COLUMN barcode text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory' AND column_name = 'qr_code'
  ) THEN
    ALTER TABLE inventory ADD COLUMN qr_code text;
  END IF;
END $$;

-- Create indexes for efficient searching
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products USING btree (barcode);
CREATE INDEX IF NOT EXISTS idx_products_qr_code ON products USING btree (qr_code);
CREATE INDEX IF NOT EXISTS idx_inventory_barcode ON inventory USING btree (barcode);
CREATE INDEX IF NOT EXISTS idx_inventory_qr_code ON inventory USING btree (qr_code);