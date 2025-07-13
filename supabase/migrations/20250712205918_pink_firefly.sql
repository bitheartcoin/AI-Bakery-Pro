/*
  # Add supplier_email column to inventory table

  1. Changes
    - Add `supplier_email` column to `inventory` table
    - Column type: text (nullable)
    - Used for storing supplier email addresses for automatic ordering

  2. Security
    - No RLS changes needed as inventory table already has proper policies
*/

-- Add supplier_email column to inventory table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inventory' AND column_name = 'supplier_email'
  ) THEN
    ALTER TABLE inventory ADD COLUMN supplier_email text;
  END IF;
END $$;