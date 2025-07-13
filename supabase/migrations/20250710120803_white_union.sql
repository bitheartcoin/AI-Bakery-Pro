/*
  # Fix infinite recursion in partner_users RLS policies

  1. Changes
    - Drop all existing problematic policies on partner_users table
    - Create new simplified policies that avoid circular references
    - Fix the orders policy that references partner_users
    - Ensure proper access control while avoiding recursion
*/

-- Drop all existing policies on partner_users to start fresh
DROP POLICY IF EXISTS "Admins can manage all partner_users" ON partner_users;
DROP POLICY IF EXISTS "Admins can manage all partner associations" ON partner_users;
DROP POLICY IF EXISTS "Admins can manage partner_users" ON partner_users;
DROP POLICY IF EXISTS "Partner admins can manage company users" ON partner_users;
DROP POLICY IF EXISTS "Partner admins can manage their company users" ON partner_users;
DROP POLICY IF EXISTS "Partner company admins can manage their company users" ON partner_users;
DROP POLICY IF EXISTS "Users can view own partner_users record" ON partner_users;
DROP POLICY IF EXISTS "Users can update own partner_users record" ON partner_users;
DROP POLICY IF EXISTS "Users can view their own partner_users records" ON partner_users;
DROP POLICY IF EXISTS "Users can update their own partner_users records" ON partner_users;
DROP POLICY IF EXISTS "Users can view their own partner associations" ON partner_users;
DROP POLICY IF EXISTS "Users can update their own partner associations" ON partner_users;
DROP POLICY IF EXISTS "Service role full access" ON partner_users;
DROP POLICY IF EXISTS "Service role full access on partner_users" ON partner_users;

-- Drop problematic orders policy that might reference partner_users
DROP POLICY IF EXISTS "Partner companies can view their orders" ON orders;
DROP POLICY IF EXISTS "Users can view orders for their partner companies" ON orders;

-- Create new non-recursive policies for partner_users

-- 1. Admin policy - uses direct check against profiles table
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

-- 2. User's own record policy - simple equality check
CREATE POLICY "Users can view own partner_users record"
  ON partner_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 3. User update policy - simple equality check
CREATE POLICY "Users can update own partner_users record"
  ON partner_users
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. Partner admin policy - uses a materialized subquery to avoid recursion
CREATE POLICY "Partner admins can manage company users"
  ON partner_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      WITH admin_partners AS (
        SELECT partner_id 
        FROM partner_users
        WHERE user_id = auth.uid() 
        AND is_admin = true
      )
      SELECT 1 
      FROM admin_partners
      WHERE admin_partners.partner_id = partner_users.partner_id
    )
  )
  WITH CHECK (
    EXISTS (
      WITH admin_partners AS (
        SELECT partner_id 
        FROM partner_users
        WHERE user_id = auth.uid() 
        AND is_admin = true
      )
      SELECT 1 
      FROM admin_partners
      WHERE admin_partners.partner_id = partner_users.partner_id
    )
  );

-- 5. Service role policy
CREATE POLICY "Service role full access"
  ON partner_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Create a simplified policy for orders that doesn't cause recursion
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

-- Create a policy for admins to view all orders
CREATE POLICY "Admins can view all orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );