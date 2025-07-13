/*
  # Add Store Inventory Tables

  1. New Tables
    - `store_inventory` - Store-specific inventory items
      - `id` (uuid, primary key)
      - `store_id` (uuid, foreign key to locations)
      - `product_id` (uuid, foreign key to products, nullable)
      - `name` (text)
      - `category` (text)
      - `current_stock` (numeric)
      - `unit` (text)
      - `min_threshold` (numeric)
      - `max_threshold` (numeric, nullable)
      - `cost_price` (numeric)
      - `selling_price` (numeric)
      - `barcode` (text, nullable)
      - `qr_code` (text, nullable)
      - `vat_percentage` (numeric)
      - `is_store_specific` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `store_inventory_transactions` - Track inventory changes in stores
      - `id` (uuid, primary key)
      - `store_id` (uuid, foreign key to locations)
      - `inventory_id` (uuid, foreign key to store_inventory)
      - `transaction_type` (text: 'addition', 'reduction', 'adjustment')
      - `quantity` (numeric)
      - `reason` (text, nullable)
      - `reference_id` (text, nullable) - For linking to POS transactions or delivery notes
      - `created_by` (uuid, foreign key to profiles)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on both tables
    - Add policies for proper access control
*/

-- Create store_inventory table
CREATE TABLE IF NOT EXISTS store_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  name text NOT NULL,
  category text NOT NULL,
  current_stock numeric(10,2) NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'db',
  min_threshold numeric(10,2) NOT NULL DEFAULT 0,
  max_threshold numeric(10,2),
  cost_price numeric(10,2) NOT NULL DEFAULT 0,
  selling_price numeric(10,2) NOT NULL DEFAULT 0,
  barcode text,
  qr_code text,
  vat_percentage numeric(5,2) NOT NULL DEFAULT 27.0,
  is_store_specific boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create store_inventory_transactions table
CREATE TABLE IF NOT EXISTS store_inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  inventory_id uuid NOT NULL REFERENCES store_inventory(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('addition', 'reduction', 'adjustment')),
  quantity numeric(10,2) NOT NULL,
  reason text,
  reference_id text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_store_inventory_store_id ON store_inventory(store_id);
CREATE INDEX IF NOT EXISTS idx_store_inventory_product_id ON store_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_store_inventory_barcode ON store_inventory(barcode);
CREATE INDEX IF NOT EXISTS idx_store_inventory_qr_code ON store_inventory(qr_code);
CREATE INDEX IF NOT EXISTS idx_store_inventory_transactions_store_id ON store_inventory_transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_store_inventory_transactions_inventory_id ON store_inventory_transactions(inventory_id);

-- Enable Row Level Security
ALTER TABLE store_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies for store_inventory
CREATE POLICY "Admins can manage all store inventory"
  ON store_inventory
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Salespersons can manage inventory in their store"
  ON store_inventory
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'salesperson'
  ));

CREATE POLICY "Everyone can read store inventory"
  ON store_inventory
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for store_inventory_transactions
CREATE POLICY "Admins can manage all store inventory transactions"
  ON store_inventory_transactions
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Salespersons can manage transactions in their store"
  ON store_inventory_transactions
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'salesperson'
  ));

CREATE POLICY "Everyone can read store inventory transactions"
  ON store_inventory_transactions
  FOR SELECT
  TO authenticated
  USING (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_store_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_store_inventory_updated_at
BEFORE UPDATE ON store_inventory
FOR EACH ROW
EXECUTE FUNCTION update_store_inventory_updated_at();

-- Create function to update inventory on transaction
CREATE OR REPLACE FUNCTION update_store_inventory_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_type = 'addition' THEN
    UPDATE store_inventory
    SET current_stock = current_stock + NEW.quantity
    WHERE id = NEW.inventory_id;
  ELSIF NEW.transaction_type = 'reduction' THEN
    UPDATE store_inventory
    SET current_stock = GREATEST(0, current_stock - NEW.quantity)
    WHERE id = NEW.inventory_id;
  ELSIF NEW.transaction_type = 'adjustment' THEN
    UPDATE store_inventory
    SET current_stock = GREATEST(0, NEW.quantity)
    WHERE id = NEW.inventory_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_store_inventory_on_transaction
AFTER INSERT ON store_inventory_transactions
FOR EACH ROW
EXECUTE FUNCTION update_store_inventory_on_transaction();