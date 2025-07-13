/*
  # Add barcode and QR code columns to recipes table

  1. Changes
    - Add `barcode` column (text, nullable) to recipes table
    - Add `qr_code` column (text, nullable) to recipes table
    - Add indexes for better performance on barcode and QR code lookups

  2. Security
    - No changes to existing RLS policies needed
    - Columns inherit existing table permissions
*/

-- Add barcode column to recipes table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'barcode'
  ) THEN
    ALTER TABLE recipes ADD COLUMN barcode text;
  END IF;
END $$;

-- Add qr_code column to recipes table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'qr_code'
  ) THEN
    ALTER TABLE recipes ADD COLUMN qr_code text;
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recipes_barcode ON recipes(barcode);
CREATE INDEX IF NOT EXISTS idx_recipes_qr_code ON recipes(qr_code);