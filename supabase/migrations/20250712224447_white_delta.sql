/*
  # Add Store Inventory Tables

  1. New Tables
    - `product_inventory` - Store inventory for each location
      - `id` (uuid, primary key)
      - `product_id` (uuid, foreign key to products)
      - `location_id` (uuid, foreign key to locations)
      - `current_stock` (integer)
      - `min_threshold` (integer)
      - `max_threshold` (integer)
      - `last_restock_date` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `product_inventory` table
    - Add policies for admins, bakers, and salespersons
*/

-- Create product_inventory table if it doesn't exist
CREATE TABLE IF NOT EXISTS product_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  location_id uuid NOT NULL REFERENCES locations(id),
  current_stock integer NOT NULL DEFAULT 0,
  min_threshold integer NOT NULL DEFAULT 0,
  max_threshold integer,
  last_restock_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create unique constraint for product_id and location_id
ALTER TABLE product_inventory ADD CONSTRAINT product_inventory_product_location_unique UNIQUE (product_id, location_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_inventory_product_id ON product_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_product_inventory_location_id ON product_inventory(location_id);
CREATE INDEX IF NOT EXISTS idx_product_inventory_current_stock ON product_inventory(current_stock);

-- Enable Row Level Security
ALTER TABLE product_inventory ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins and bakers can manage product_inventory" 
  ON product_inventory 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'baker')
    )
  );

CREATE POLICY "Anonymous users can read product_inventory" 
  ON product_inventory 
  FOR SELECT 
  TO anon 
  USING (true);

CREATE POLICY "Everyone can read product_inventory" 
  ON product_inventory 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Add trigger for updating updated_at column
CREATE TRIGGER update_product_inventory_updated_at
BEFORE UPDATE ON product_inventory
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add vat_percentage column to products table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'vat_percentage'
  ) THEN
    ALTER TABLE products ADD COLUMN vat_percentage numeric(5,2) DEFAULT 18.0;
  END IF;
END $$;

-- Add location_id column to pos_transactions table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pos_transactions' AND column_name = 'location_id'
  ) THEN
    ALTER TABLE pos_transactions ADD COLUMN location_id uuid REFERENCES locations(id);
  END IF;
END $$;