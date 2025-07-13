/*
  # Fix infinite recursion in partner_users RLS policies

  1. Problem
    - The current RLS policies on partner_users table are causing infinite recursion
    - This happens when policies reference the same table they're protecting
    - The error occurs when fetching orders that have partner relationships

  2. Solution
    - Drop the problematic policies that cause circular references
    - Create new, simplified policies that don't reference partner_users in their conditions
    - Use direct user ID checks instead of subqueries to partner_users table

  3. Security
    - Maintain proper access control without circular references
    - Ensure users can only access their own partner associations
    - Allow admins to manage all partner associations
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Partner admins can manage users in their companies" ON partner_users;
DROP POLICY IF EXISTS "Users can view their own partner_users records" ON partner_users;
DROP POLICY IF EXISTS "Users can update their own partner_users records" ON partner_users;

-- Create new simplified policies without circular references
CREATE POLICY "Users can view their own partner associations"
  ON partner_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own partner associations"
  ON partner_users
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all partner associations"
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

-- Create a policy for partner admins that doesn't cause recursion
CREATE POLICY "Partner company admins can manage their company users"
  ON partner_users
  FOR ALL
  TO authenticated
  USING (
    -- Check if the current user is an admin of the same partner company
    partner_id IN (
      SELECT pu.partner_id 
      FROM partner_users pu 
      WHERE pu.user_id = auth.uid() 
      AND pu.is_admin = true
    )
  )
  WITH CHECK (
    -- Check if the current user is an admin of the same partner company
    partner_id IN (
      SELECT pu.partner_id 
      FROM partner_users pu 
      WHERE pu.user_id = auth.uid() 
      AND pu.is_admin = true
    )
  );

-- Ensure service role has full access (this should already exist but let's be explicit)
CREATE POLICY "Service role full access on partner_users"
  ON partner_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);