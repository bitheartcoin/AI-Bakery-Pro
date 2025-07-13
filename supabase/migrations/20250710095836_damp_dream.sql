/*
  # Create payments and payment_items tables

  1. New Tables
    - `payments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to profiles)
      - `amount` (numeric)
      - `currency` (text, default 'HUF')
      - `status` (text, default 'pending')
      - `payment_method` (text)
      - `description` (text)
      - `reference_id` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    - `payment_items`
      - `id` (uuid, primary key)
      - `payment_id` (uuid, foreign key to payments)
      - `name` (text)
      - `amount` (numeric)
      - `quantity` (integer)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own payments
    - Add policies for admins to manage all payments

  3. Functions
    - Add function to calculate payment from work logs
*/

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'HUF',
  status text NOT NULL DEFAULT 'pending',
  payment_method text NOT NULL,
  description text,
  reference_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payment_items table
CREATE TABLE IF NOT EXISTS payment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid REFERENCES payments(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1
);

-- Add constraints
ALTER TABLE payments ADD CONSTRAINT IF NOT EXISTS payments_status_check 
  CHECK (status IN ('pending', 'completed', 'failed', 'refunded'));

ALTER TABLE payments ADD CONSTRAINT IF NOT EXISTS payments_payment_method_check 
  CHECK (payment_method IN ('cash', 'card', 'transfer', 'other'));

ALTER TABLE payments ADD CONSTRAINT IF NOT EXISTS payments_amount_check 
  CHECK (amount >= 0);

ALTER TABLE payment_items ADD CONSTRAINT IF NOT EXISTS payment_items_amount_check 
  CHECK (amount >= 0);

ALTER TABLE payment_items ADD CONSTRAINT IF NOT EXISTS payment_items_quantity_check 
  CHECK (quantity > 0);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_items ENABLE ROW LEVEL SECURITY;

-- Create policies for payments
CREATE POLICY "Users can view their own payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own payments"
  ON payments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own payments"
  ON payments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own payments"
  ON payments
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all payments"
  ON payments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create policies for payment_items
CREATE POLICY "Users can view payment items for their payments"
  ON payment_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM payments 
      WHERE payments.id = payment_items.payment_id 
      AND payments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert payment items for their payments"
  ON payment_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM payments 
      WHERE payments.id = payment_items.payment_id 
      AND payments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update payment items for their payments"
  ON payment_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM payments 
      WHERE payments.id = payment_items.payment_id 
      AND payments.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM payments 
      WHERE payments.id = payment_items.payment_id 
      AND payments.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete payment items for their payments"
  ON payment_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM payments 
      WHERE payments.id = payment_items.payment_id 
      AND payments.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all payment items"
  ON payment_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_reference_id ON payments(reference_id);
CREATE INDEX IF NOT EXISTS idx_payment_items_payment_id ON payment_items(payment_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_payments_updated_at'
    ) THEN
        CREATE TRIGGER update_payments_updated_at
            BEFORE UPDATE ON payments
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Create function to calculate payment from work logs
CREATE OR REPLACE FUNCTION calculate_payment_from_work_logs(
  employee_id uuid,
  start_date date,
  end_date date
)
RETURNS numeric AS $$
DECLARE
  total_hours numeric := 0;
  hourly_wage numeric := 0;
  total_payment numeric := 0;
BEGIN
  -- Get employee's hourly wage
  SELECT COALESCE(p.hourly_wage, 0) INTO hourly_wage
  FROM profiles p
  WHERE p.id = employee_id;
  
  -- Calculate total hours worked in the date range
  SELECT COALESCE(SUM(
    CASE 
      WHEN wl.duration IS NOT NULL THEN wl.duration / 60.0
      WHEN wl.end_time IS NOT NULL AND wl.start_time IS NOT NULL THEN 
        EXTRACT(EPOCH FROM (wl.end_time - wl.start_time)) / 3600.0
      ELSE 0
    END
  ), 0) INTO total_hours
  FROM work_logs wl
  WHERE wl.employee_id = calculate_payment_from_work_logs.employee_id
    AND wl.start_time::date >= calculate_payment_from_work_logs.start_date
    AND wl.start_time::date <= calculate_payment_from_work_logs.end_date
    AND wl.status = 'completed';
  
  -- Calculate total payment
  total_payment := total_hours * hourly_wage;
  
  RETURN total_payment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;