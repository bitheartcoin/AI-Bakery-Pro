/*
  # Create POS Transactions Table

  1. New Tables
    - `pos_transactions`
      - `id` (uuid, primary key)
      - `transaction_number` (text)
      - `cashier_id` (uuid, foreign key to profiles)
      - `items` (jsonb)
      - `total_amount` (numeric)
      - `payment_method` (text)
      - `created_at` (timestamp)
      - `location_id` (uuid, foreign key to locations)
  2. Security
    - Enable RLS on `pos_transactions` table
    - Add policies for admins and salespersons
*/

-- Create POS transactions table
CREATE TABLE IF NOT EXISTS pos_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_number text NOT NULL,
  cashier_id uuid REFERENCES profiles(id),
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL,
  created_at timestamptz DEFAULT now(),
  location_id uuid REFERENCES locations(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_pos_transactions_cashier_id ON pos_transactions(cashier_id);
CREATE INDEX IF NOT EXISTS idx_pos_transactions_created_at ON pos_transactions(created_at);

-- Enable Row Level Security
ALTER TABLE pos_transactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all POS transactions"
  ON pos_transactions
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Salespersons can manage their own POS transactions"
  ON pos_transactions
  FOR ALL
  TO authenticated
  USING (
    cashier_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'salesperson'
    )
  );

-- Add trigger to update dashboard stats
CREATE TRIGGER trigger_update_dashboard_stats_pos
  AFTER INSERT ON pos_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_dashboard_stats();