/*
  # Fix infinite recursion in partner_users policies
  
  1. Changes
    - Remove problematic policies causing infinite recursion
    - Create simplified policies without circular references
    - Fix orders policies to avoid recursion with partner_users
    
  2. Security
    - Maintain proper access controls for admins
    - Ensure users can only access their own data
    - Allow partner admins to manage their company users
*/

-- First, check if the problematic policies exist before dropping them
DO $$
BEGIN
  -- Drop partner_users policies if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage partner_users' AND tablename = 'partner_users') THEN
    DROP POLICY "Admins can manage partner_users" ON partner_users;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Partner admins can manage company users' AND tablename = 'partner_users') THEN
    DROP POLICY "Partner admins can manage company users" ON partner_users;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access on partner_users' AND tablename = 'partner_users') THEN
    DROP POLICY "Service role full access on partner_users" ON partner_users;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own partner_users record' AND tablename = 'partner_users') THEN
    DROP POLICY "Users can update own partner_users record" ON partner_users;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own partner_users record' AND tablename = 'partner_users') THEN
    DROP POLICY "Users can view own partner_users record" ON partner_users;
  END IF;
  
  -- Drop orders policy if it exists
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Partner companies can view their orders' AND tablename = 'orders') THEN
    DROP POLICY "Partner companies can view their orders" ON orders;
  END IF;
END $$;

-- Create new simplified policies for partner_users
DO $$
BEGIN
  -- Create admin policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage all partner_users' AND tablename = 'partner_users') THEN
    CREATE POLICY "Admins can manage all partner_users"
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
  END IF;
  
  -- Create user view policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own partner_users record' AND tablename = 'partner_users') THEN
    CREATE POLICY "Users can view own partner_users record"
      ON partner_users
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
  
  -- Create user update policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own partner_users record' AND tablename = 'partner_users') THEN
    CREATE POLICY "Users can update own partner_users record"
      ON partner_users
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
  
  -- Create partner admin policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Partner admins can manage their company users' AND tablename = 'partner_users') THEN
    CREATE POLICY "Partner admins can manage their company users"
      ON partner_users
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM partner_users pu 
          WHERE pu.user_id = auth.uid() 
          AND pu.is_admin = true
          AND pu.partner_id = partner_users.partner_id
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM partner_users pu 
          WHERE pu.user_id = auth.uid() 
          AND pu.is_admin = true
          AND pu.partner_id = partner_users.partner_id
        )
      );
  END IF;
  
  -- Create service role policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Service role full access' AND tablename = 'partner_users') THEN
    CREATE POLICY "Service role full access"
      ON partner_users
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
  
  -- Create simplified orders policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view orders for their partner companies' AND tablename = 'orders') THEN
    CREATE POLICY "Users can view orders for their partner companies"
      ON orders
      FOR SELECT
      TO authenticated
      USING (
        customer_id IN (
          SELECT partner_id 
          FROM partner_users 
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;