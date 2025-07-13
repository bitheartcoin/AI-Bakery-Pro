/*
  # Create partner user login functionality

  1. New Features
    - Create a function to create partner user accounts
    - Add 'partner' to the allowed roles in profiles
    - Create sample partner user
    
  2. Changes
    - Add partner role to profiles_role_check constraint
    - Create function to create partner users with proper permissions
    - Create sample partner user for testing
*/

-- Add 'partner' to the allowed roles in profiles
DO $$
BEGIN
  -- Check if the constraint already exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_role_check'
  ) THEN
    -- Drop the existing constraint
    ALTER TABLE profiles DROP CONSTRAINT profiles_role_check;
    
    -- Add the new constraint with 'partner' role
    ALTER TABLE profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role = ANY (ARRAY['admin'::text, 'baker'::text, 'salesperson'::text, 'driver'::text, 'partner'::text]));
  END IF;
END $$;

-- Create a function to create partner user accounts
CREATE OR REPLACE FUNCTION create_partner_user(
  email TEXT,
  password TEXT,
  full_name TEXT,
  partner_id UUID,
  is_admin BOOLEAN DEFAULT false
) RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Create user in auth.users
  INSERT INTO auth.users (
    email,
    raw_user_meta_data,
    created_at
  ) VALUES (
    email,
    jsonb_build_object(
      'full_name', full_name,
      'partner_id', partner_id,
      'is_partner', true
    ),
    now()
  ) RETURNING id INTO new_user_id;
  
  -- Set password
  UPDATE auth.users
  SET encrypted_password = crypt(password, gen_salt('bf'))
  WHERE id = new_user_id;
  
  -- Create profile
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    role,
    status
  ) VALUES (
    new_user_id,
    full_name,
    email,
    'partner',
    'active'
  );
  
  -- Create partner_user association
  INSERT INTO public.partner_users (
    user_id,
    partner_id,
    role,
    is_admin
  ) VALUES (
    new_user_id,
    partner_id,
    CASE WHEN is_admin THEN 'admin' ELSE 'member' END,
    is_admin
  );
  
  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a sample partner user
DO $$
DECLARE
  partner_id UUID;
BEGIN
  -- Get the first partner company
  SELECT id INTO partner_id FROM partner_companies LIMIT 1;
  
  -- Only create if we have a partner and the user doesn't exist
  IF partner_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'partner@example.com'
  ) THEN
    PERFORM create_partner_user(
      'partner@example.com',
      'partner123',
      'Partner User',
      partner_id,
      true
    );
  END IF;
END $$;

-- Create a table for default orders if it doesn't exist
CREATE TABLE IF NOT EXISTS default_orders (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id uuid REFERENCES partner_companies(id) ON DELETE CASCADE,
  items jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on default_orders
ALTER TABLE default_orders ENABLE ROW LEVEL SECURITY;

-- Create policies for default_orders
CREATE POLICY "Admins can manage all default orders"
  ON default_orders
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

CREATE POLICY "Partners can view their own default orders"
  ON default_orders
  FOR SELECT
  TO authenticated
  USING (
    partner_id IN (
      SELECT partner_id
      FROM partner_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Partners can update their own default orders"
  ON default_orders
  FOR UPDATE
  TO authenticated
  USING (
    partner_id IN (
      SELECT partner_id
      FROM partner_users
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    partner_id IN (
      SELECT partner_id
      FROM partner_users
      WHERE user_id = auth.uid()
    )
  );

-- Create a trigger to update updated_at
CREATE TRIGGER update_default_orders_updated_at
  BEFORE UPDATE ON default_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();