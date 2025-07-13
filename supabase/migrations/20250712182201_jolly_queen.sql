/*
  # Add Barcode and QR Code to Products

  1. New Columns
    - Add `barcode` column to products table
    - Add `qr_code` column to products table
    
  2. Security
    - Maintain existing RLS policies
*/

-- Add barcode and qr_code columns to products table if they don't exist
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

-- Add barcode and qr_code columns to inventory table if they don't exist
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

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_qr_code ON products(qr_code);
CREATE INDEX IF NOT EXISTS idx_inventory_barcode ON inventory(barcode);
CREATE INDEX IF NOT EXISTS idx_inventory_qr_code ON inventory(qr_code);