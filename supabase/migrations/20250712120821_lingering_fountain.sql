/*
  # Add webshop_order_id to production_batches

  1. New Columns
    - `webshop_order_id` (text) - Stores the webshop order ID for tracking
  
  2. Changes
    - Adds a new column to production_batches table to track webshop orders
*/

-- Add webshop_order_id column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'production_batches' AND column_name = 'webshop_order_id'
  ) THEN
    ALTER TABLE production_batches ADD COLUMN webshop_order_id text;
  END IF;
END $$;