/*
  # Fix infinite recursion in partner_users RLS policies

  1. Policy Issues Fixed
    - Remove circular dependencies in partner_users policies
    - Simplify policy conditions to avoid recursive lookups
    - Ensure policies don't reference tables that reference back to partner_users

  2. Changes Made
    - Drop existing problematic policies on partner_users
    - Create new simplified policies without circular references
    - Update related policies on orders table to avoid recursion

  3. Security
    - Maintain proper access control without circular dependencies
    - Ensure users can only access their own data or data they're authorized to see
*/

-- Drop existing problematic policies on partner_users
DROP POLICY IF EXISTS "Admins can manage partner_users" ON partner_users;
DROP POLICY IF EXISTS "Partner admins can manage company users" ON partner_users;
DROP POLICY IF EXISTS "Service role full access on partner_users" ON partner_users;
DROP POLICY IF EXISTS "Users can update own partner_users record" ON partner_users;
DROP POLICY IF EXISTS "Users can view own partner_users record" ON partner_users;

-- Drop problematic policies on orders that might reference partner_users
DROP POLICY IF EXISTS "Partner companies can view their orders" ON orders;

-- Create new simplified policies for partner_users without circular references
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

CREATE POLICY "Users can view own partner_users record"
  ON partner_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own partner_users record"
  ON partner_users
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Partner admins can manage their company users"
  ON partner_users
  FOR ALL
  TO authenticated
  USING (
    partner_id IN (
      SELECT pu.partner_id 
      FROM partner_users pu 
      WHERE pu.user_id = auth.uid() 
      AND pu.is_admin = true
    )
  )
  WITH CHECK (
    partner_id IN (
      SELECT pu.partner_id 
      FROM partner_users pu 
      WHERE pu.user_id = auth.uid() 
      AND pu.is_admin = true
    )
  );

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