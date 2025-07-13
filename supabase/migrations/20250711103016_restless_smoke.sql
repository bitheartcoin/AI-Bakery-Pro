/*
  # Create POS Transactions Table
  
  1. New Tables
    - `pos_transactions` - Stores point-of-sale transactions separate from regular orders
      - `id` (uuid, primary key)
      - `transaction_number` (text, unique identifier for the transaction)
      - `items` (jsonb, array of items in the transaction)
      - `total_amount` (numeric, total amount of the transaction)
      - `payment_method` (text, method of payment)
      - `cashier_id` (uuid, reference to the user who processed the transaction)
      - `location_id` (uuid, reference to the location where the transaction occurred)
      - `created_at` (timestamp, when the transaction was created)
  
  2. Security
    - Enable RLS on `pos_transactions` table
    - Add policies for authenticated users to manage transactions
*/

-- Create POS Transactions Table
CREATE TABLE IF NOT EXISTS pos_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_number text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL,
  cashier_id uuid REFERENCES profiles(id),
  location_id uuid REFERENCES locations(id),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pos_transactions_cashier_id ON pos_transactions(cashier_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_created_at ON pos_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_transaction_number ON pos_transactions(transaction_number);

-- Enable Row Level Security
ALTER TABLE pos_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all transactions"
  ON pos_transactions
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Salespersons can manage transactions"
  ON pos_transactions
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'salesperson'
  ));

CREATE POLICY "Users can view their own transactions"
  ON pos_transactions
  FOR SELECT
  TO authenticated
  USING (cashier_id = auth.uid());