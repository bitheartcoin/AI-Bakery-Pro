/*
  # Create POS Register Logs Table

  1. New Tables
    - `pos_register_logs`
      - `id` (uuid, primary key)
      - `register_id` (text, not null)
      - `location_id` (uuid, foreign key to locations)
      - `cashier_id` (uuid, foreign key to profiles)
      - `action` (text, not null)
      - `amount` (numeric(10,2))
      - `notes` (text)
      - `created_at` (timestamptz, default now())
  2. Security
    - Enable RLS on `pos_register_logs` table
    - Add policies for admins and salespersons
*/

CREATE TABLE IF NOT EXISTS pos_register_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  register_id text NOT NULL,
  location_id uuid REFERENCES locations(id),
  cashier_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  amount numeric(10,2),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Add constraint to check valid actions
ALTER TABLE pos_register_logs ADD CONSTRAINT pos_register_logs_action_check 
  CHECK (action = ANY (ARRAY['open', 'close', 'add_cash', 'remove_cash', 'correction']));

-- Enable Row Level Security
ALTER TABLE pos_register_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all register logs"
  ON pos_register_logs
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Salespersons can manage register logs at their location"
  ON pos_register_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND (profiles.role = 'salesperson' OR profiles.role = 'admin')
    )
  );

-- Create indexes
CREATE INDEX idx_pos_register_logs_location_id ON pos_register_logs(location_id);
CREATE INDEX idx_pos_register_logs_cashier_id ON pos_register_logs(cashier_id);
CREATE INDEX idx_pos_register_logs_created_at ON pos_register_logs(created_at);