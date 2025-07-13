-- Fix authentication issues and add payment module

-- Drop all existing policies on profiles to start clean
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin role can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can read basic profile info" ON profiles;
DROP POLICY IF EXISTS "All users can view basic profile info" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can manage employees" ON profiles;
DROP POLICY IF EXISTS "Everyone can read employees" ON profiles;
DROP POLICY IF EXISTS "Everyone can read profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;

-- Create simple, non-recursive policies

-- 1. Allow all users to read all profiles (this is needed for the admin menu to work)
CREATE POLICY "Everyone can read profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 3. Allow admins to manage all profiles
CREATE POLICY "Admins can manage profiles"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'role' = 'admin' OR
        auth.users.raw_app_meta_data->>'role' = 'admin'
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'role' = 'admin' OR
        auth.users.raw_app_meta_data->>'role' = 'admin'
      )
    )
  );

-- 4. Service role access (for system operations)
CREATE POLICY "Service role can manage all profiles"
  ON profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Update admin user metadata to ensure they have admin role
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', '"admin"')
WHERE email = 'admin@szemesipekseg.hu';

-- Create admin user if it doesn't exist
DO $$
DECLARE
  admin_exists boolean;
  admin_id uuid;
BEGIN
  -- Check if admin user exists
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = 'admin@szemesipekseg.hu'
  ) INTO admin_exists;
  
  IF NOT admin_exists THEN
    -- Create admin user
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@szemesipekseg.hu',
      crypt('admin123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"role": "admin", "full_name": "Admin Felhasználó"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO admin_id;
    
    -- Create admin profile
    IF admin_id IS NOT NULL THEN
      INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        status,
        created_at,
        updated_at
      )
      VALUES (
        admin_id,
        'admin@szemesipekseg.hu',
        'Admin Felhasználó',
        'admin',
        'active',
        now(),
        now()
      );
    END IF;
  END IF;
END $$;

-- Create payments table if it doesn't exist
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES profiles(id),
  amount numeric(10,2) NOT NULL,
  payment_date date NOT NULL,
  payment_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  description text,
  reference_number text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT payments_payment_type_check CHECK (payment_type IN ('salary', 'bonus', 'advance', 'reimbursement', 'other')),
  CONSTRAINT payments_status_check CHECK (status IN ('pending', 'completed', 'cancelled', 'failed'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payments_employee_id ON payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Enable RLS on payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Create policies for payments table
CREATE POLICY "Users can view their own payments"
  ON payments
  FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Admins can manage all payments"
  ON payments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'role' = 'admin' OR
        auth.users.raw_app_meta_data->>'role' = 'admin'
      )
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Create salary_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS salary_settings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES profiles(id),
  base_salary numeric(10,2) NOT NULL,
  hourly_rate numeric(10,2),
  tax_rate numeric(5,2),
  social_security_rate numeric(5,2),
  bonus_rate numeric(5,2),
  payment_day integer,
  bank_account text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT salary_settings_payment_day_check CHECK (payment_day BETWEEN 1 AND 31)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_salary_settings_employee_id ON salary_settings(employee_id);

-- Enable RLS on salary_settings table
ALTER TABLE salary_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for salary_settings table
CREATE POLICY "Users can view their own salary settings"
  ON salary_settings
  FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Admins can manage all salary settings"
  ON salary_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND (
        auth.users.raw_user_meta_data->>'role' = 'admin' OR
        auth.users.raw_app_meta_data->>'role' = 'admin'
      )
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_salary_settings_updated_at
BEFORE UPDATE ON salary_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Insert default salary settings for existing employees
INSERT INTO salary_settings (employee_id, base_salary, hourly_rate, tax_rate, social_security_rate, bonus_rate, payment_day)
SELECT 
  id, 
  COALESCE(salary, 0), 
  COALESCE(salary / 168, 0), -- Assuming 168 working hours per month
  15.0, -- Default tax rate 15%
  18.5, -- Default social security rate 18.5%
  5.0,  -- Default bonus rate 5%
  10    -- Default payment day on the 10th
FROM profiles
WHERE id NOT IN (SELECT employee_id FROM salary_settings)
ON CONFLICT (employee_id) DO NOTHING;