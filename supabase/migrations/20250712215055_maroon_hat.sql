/*
  # Add supplier_email to inventory table

  1. New Fields
    - Add `supplier_email` field to the `inventory` table if it doesn't exist
    
  2. Security
    - No changes to security policies
*/

-- Check if supplier_email column exists and add it if it doesn't
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory' AND column_name = 'supplier_email'
  ) THEN
    ALTER TABLE inventory ADD COLUMN supplier_email text;
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_inventory_supplier_email ON public.inventory USING btree (supplier_email);