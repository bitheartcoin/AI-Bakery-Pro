/*
  # Add returns table for POS system

  1. New Tables
    - `pos_returns` - Stores return transactions from POS system
      - `id` (uuid, primary key)
      - `transaction_number` (text)
      - `items` (jsonb)
      - `total_amount` (numeric)
      - `reason` (text)
      - `cashier_id` (uuid)
      - `location_id` (uuid)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on `pos_returns` table
    - Add policies for admins and salespersons
*/

-- Create returns table
CREATE TABLE IF NOT EXISTS pos_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_number text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  reason text,
  cashier_id uuid REFERENCES profiles(id),
  location_id uuid REFERENCES locations(id),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pos_returns_cashier_id ON pos_returns USING btree (cashier_id);
CREATE INDEX IF NOT EXISTS idx_pos_returns_created_at ON pos_returns USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_pos_returns_transaction_number ON pos_returns USING btree (transaction_number);

-- Enable RLS
ALTER TABLE pos_returns ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all returns"
  ON pos_returns
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = uid()
    AND profiles.role = 'admin'
  ));

CREATE POLICY "Salespersons can manage returns"
  ON pos_returns
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = uid()
    AND profiles.role = 'salesperson'
  ));

CREATE POLICY "Users can view their own returns"
  ON pos_returns
  FOR SELECT
  TO authenticated
  USING (cashier_id = uid());