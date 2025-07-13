/*
  # Add product codes fields

  1. New Fields
    - Add `barcode` and `qr_code` fields to the `products` table if they don't exist
    
  2. Security
    - No changes to security policies
*/

-- Check if barcode column exists and add it if it doesn't
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'barcode'
  ) THEN
    ALTER TABLE products ADD COLUMN barcode text;
  END IF;
END $$;

-- Check if qr_code column exists and add it if it doesn't
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'qr_code'
  ) THEN
    ALTER TABLE products ADD COLUMN qr_code text;
  END IF;
END $$;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products USING btree (barcode);
CREATE INDEX IF NOT EXISTS idx_products_qr_code ON public.products USING btree (qr_code);