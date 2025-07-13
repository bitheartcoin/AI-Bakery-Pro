/*
  # Add Multiple Price Fields to Products Table

  1. New Columns
    - Add wholesale_price to products table
    - Add retail_price to products table
  
  2. Purpose
    - Support different pricing tiers for different customer types
    - Allow setting separate prices for retail and wholesale customers
*/

-- Add price fields to products table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'wholesale_price'
  ) THEN
    ALTER TABLE products ADD COLUMN wholesale_price numeric(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'retail_price'
  ) THEN
    ALTER TABLE products ADD COLUMN retail_price numeric(10,2) DEFAULT 0;
  END IF;
END $$;

-- Add price fields to recipes table if they don't exist (for compatibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'wholesale_price'
  ) THEN
    ALTER TABLE recipes ADD COLUMN wholesale_price numeric(10,2) DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'recipes' AND column_name = 'retail_price'
  ) THEN
    ALTER TABLE recipes ADD COLUMN retail_price numeric(10,2) DEFAULT 0;
  END IF;
END $$;