/*
  # Add barcode and QR code fields to products table

  1. New Fields
    - `barcode` (text, nullable) - Stores the barcode value for the product
    - `qr_code` (text, nullable) - Stores the QR code value for the product
  
  2. Indexes
    - Added indexes on both fields for faster lookups
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

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products USING btree (barcode);
CREATE INDEX IF NOT EXISTS idx_products_qr_code ON public.products USING btree (qr_code);