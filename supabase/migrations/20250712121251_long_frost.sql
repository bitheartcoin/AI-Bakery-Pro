/*
  # Add webshop_order_id to production_batches if it doesn't exist

  1. New Columns
    - Add `webshop_order_id` text column to production_batches table if it doesn't exist
    
  2. Indexes
    - Add index on webshop_order_id for faster lookups
*/

-- Check if webshop_order_id column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'production_batches' 
    AND column_name = 'webshop_order_id'
  ) THEN
    ALTER TABLE production_batches ADD COLUMN webshop_order_id text;
  END IF;
END $$;

-- Create index on webshop_order_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'production_batches' 
    AND indexname = 'idx_production_batches_webshop_order_id'
  ) THEN
    CREATE INDEX idx_production_batches_webshop_order_id ON production_batches(webshop_order_id);
  END IF;
END $$;