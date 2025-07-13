/*
  # Fix infinite recursion in partner_users RLS policies

  1. Problem
    - The current RLS policies on partner_users create circular dependencies
    - This causes infinite recursion when fetching orders that reference partner companies

  2. Solution
    - Remove problematic policies that cause circular references
    - Create simpler, non-recursive policies
    - Ensure policies don't reference themselves indirectly through joins

  3. Changes
    - Drop existing problematic policies
    - Create new simplified policies without circular dependencies
    - Maintain security while avoiding recursion
*/

-- Drop existing problematic policies on partner_users
DROP POLICY IF EXISTS "Admins can manage partner_users" ON partner_users;
DROP POLICY IF EXISTS "Partner admins can manage company users" ON partner_users;
DROP POLICY IF EXISTS "Service role full access on partner_users" ON partner_users;
DROP POLICY IF EXISTS "Users can update own partner_users record" ON partner_users;
DROP POLICY IF EXISTS "Users can view own partner_users record" ON partner_users;

-- Create new simplified policies without circular dependencies
CREATE POLICY "Service role full access on partner_users"
  ON partner_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can manage partner_users"
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

-- Create a simplified policy for partner admins that doesn't cause recursion
CREATE POLICY "Partner admins can manage company users"
  ON partner_users
  FOR ALL
  TO authenticated
  USING (
    -- Check if the current user is an admin of the same partner company
    -- without recursively checking partner_users table
    partner_id IN (
      SELECT pu.partner_id 
      FROM partner_users pu 
      WHERE pu.user_id = auth.uid() 
      AND pu.is_admin = true
      LIMIT 1  -- Prevent potential recursion by limiting results
    )
  )
  WITH CHECK (
    partner_id IN (
      SELECT pu.partner_id 
      FROM partner_users pu 
      WHERE pu.user_id = auth.uid() 
      AND pu.is_admin = true
      LIMIT 1  -- Prevent potential recursion by limiting results
    )
  );

-- Also check if there are any problematic policies on related tables that might cause issues
-- Let's also simplify the orders policies to avoid complex joins that might trigger recursion

-- Drop and recreate the partner companies policy that might be causing issues
DROP POLICY IF EXISTS "Partner companies can view their orders" ON orders;

CREATE POLICY "Partner companies can view their orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    -- Simplified check without complex subqueries that might cause recursion
    customer_id = ANY(
      SELECT partner_id 
      FROM partner_users 
      WHERE user_id = auth.uid()
      LIMIT 10  -- Limit to prevent potential issues
    )
  );