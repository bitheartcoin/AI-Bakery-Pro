/*
  # Add payments and partner tables

  1. New Tables
    - Create payments table for tracking financial transactions
    - Create payment_items table for tracking individual items in payments
    - Create partner_companies table for managing external partners
    - Create partner_users table for managing partner company users
    
  2. Schema
    - payments: Tracks payment transactions
    - payment_items: Tracks individual items in a payment
    - partner_companies: Stores information about partner companies
    - partner_users: Links users to partner companies with specific roles
*/

-- Create payments table
CREATE TABLE payments (
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
CREATE TABLE payment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid REFERENCES payments(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 1
);

-- Create partner_companies table
CREATE TABLE partner_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tax_number text,
  address text,
  city text,
  postal_code text,
  country text DEFAULT 'Hungary',
  phone text,
  email text,
  contact_person text,
  status text DEFAULT 'active',
  discount_percentage numeric(5,2) DEFAULT 0,
  payment_terms text DEFAULT 'immediate',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create partner_users table
CREATE TABLE partner_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  partner_id uuid REFERENCES partner_companies(id) ON DELETE CASCADE,
  role text DEFAULT 'member',
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, partner_id)
);

-- Add constraints
ALTER TABLE payments ADD CONSTRAINT payments_status_check 
  CHECK (status IN ('pending', 'completed', 'failed', 'refunded'));

ALTER TABLE payments ADD CONSTRAINT payments_payment_method_check 
  CHECK (payment_method IN ('cash', 'card', 'transfer', 'other'));

ALTER TABLE payments ADD CONSTRAINT payments_amount_check 
  CHECK (amount >= 0);

ALTER TABLE payment_items ADD CONSTRAINT payment_items_amount_check 
  CHECK (amount >= 0);

ALTER TABLE payment_items ADD CONSTRAINT payment_items_quantity_check 
  CHECK (quantity > 0);

ALTER TABLE partner_companies ADD CONSTRAINT partner_companies_status_check
  CHECK (status IN ('active', 'inactive', 'suspended'));

ALTER TABLE partner_companies ADD CONSTRAINT partner_companies_payment_terms_check
  CHECK (payment_terms IN ('immediate', 'net15', 'net30', 'net60'));

ALTER TABLE partner_users ADD CONSTRAINT partner_users_role_check
  CHECK (role IN ('owner', 'admin', 'member', 'viewer'));

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_users ENABLE ROW LEVEL SECURITY;

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

-- Create policies for partner_companies
CREATE POLICY "Admins can manage all partner companies"
  ON partner_companies
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

CREATE POLICY "Partners can view their own company"
  ON partner_companies
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM partner_users
      WHERE partner_users.user_id = auth.uid()
      AND partner_users.partner_id = partner_companies.id
    )
  );

-- Create policies for partner_users
CREATE POLICY "Admins can manage all partner users"
  ON partner_users
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

CREATE POLICY "Partner admins can manage users in their company"
  ON partner_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM partner_users pu
      WHERE pu.user_id = auth.uid()
      AND pu.partner_id = partner_users.partner_id
      AND pu.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM partner_users pu
      WHERE pu.user_id = auth.uid()
      AND pu.partner_id = partner_users.partner_id
      AND pu.is_admin = true
    )
  );

CREATE POLICY "Users can view their own partner associations"
  ON partner_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_payments_user_id ON payments(user_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_payments_reference_id ON payments(reference_id);
CREATE INDEX idx_payment_items_payment_id ON payment_items(payment_id);
CREATE INDEX idx_partner_users_user_id ON partner_users(user_id);
CREATE INDEX idx_partner_users_partner_id ON partner_users(partner_id);
CREATE INDEX idx_partner_companies_status ON partner_companies(status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_companies_updated_at
    BEFORE UPDATE ON partner_companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_partner_users_updated_at
    BEFORE UPDATE ON partner_users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

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