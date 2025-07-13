/*
  # Create inventory transactions table

  1. New Tables
    - `inventory_transactions` - Tracks all inventory changes including additions, reductions, returns, etc.
      - `id` (uuid, primary key)
      - `inventory_id` (uuid, foreign key to inventory)
      - `transaction_type` (text) - 'addition', 'reduction', 'return', etc.
      - `quantity` (numeric)
      - `reason` (text)
      - `reference_id` (text) - Optional reference to order, return, etc.
      - `created_by` (uuid, foreign key to profiles)
      - `created_at` (timestamp with time zone)
  
  2. Security
    - Enable RLS on `inventory_transactions` table
    - Add policies for admins, bakers, and salespersons
*/

-- Create inventory transactions table
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id uuid NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('addition', 'reduction', 'return', 'adjustment')),
  quantity numeric(10,2) NOT NULL,
  reason text,
  reference_id text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_inventory_id ON inventory_transactions(inventory_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_transaction_type ON inventory_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_by ON inventory_transactions(created_by);

-- Enable RLS
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all inventory transactions"
  ON inventory_transactions
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  ));

CREATE POLICY "Bakers can manage inventory transactions"
  ON inventory_transactions
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'baker'
  ));

CREATE POLICY "Salespersons can manage inventory transactions"
  ON inventory_transactions
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'salesperson'
  ));

-- Create trigger function to update inventory on transaction
CREATE OR REPLACE FUNCTION update_inventory_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_type = 'addition' OR NEW.transaction_type = 'return' THEN
    -- Increase inventory
    UPDATE inventory
    SET current_stock = current_stock + NEW.quantity,
        last_restocked = CURRENT_TIMESTAMP
    WHERE id = NEW.inventory_id;
  ELSIF NEW.transaction_type = 'reduction' THEN
    -- Decrease inventory
    UPDATE inventory
    SET current_stock = GREATEST(0, current_stock - NEW.quantity)
    WHERE id = NEW.inventory_id;
  ELSIF NEW.transaction_type = 'adjustment' THEN
    -- Direct adjustment (set to specific value)
    UPDATE inventory
    SET current_stock = NEW.quantity,
        last_restocked = CURRENT_TIMESTAMP
    WHERE id = NEW.inventory_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_inventory_on_transaction
AFTER INSERT ON inventory_transactions
FOR EACH ROW
EXECUTE FUNCTION update_inventory_on_transaction();