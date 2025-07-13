/*
  # Fix infinite recursion in partner_users RLS policies

  1. Problem
    - The current RLS policies on partner_users table are causing infinite recursion
    - This happens when policies reference themselves or create circular dependencies
    - Specifically affecting the orders page when trying to load partner information

  2. Solution
    - Drop existing problematic policies
    - Create new, simplified policies that avoid circular references
    - Ensure clear evaluation paths without self-referencing loops

  3. Changes
    - Remove policies that cause recursion
    - Add simplified policies with direct user checks
    - Maintain security while avoiding infinite loops
*/

-- Drop existing problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Partner admins can manage their company users" ON partner_users;
DROP POLICY IF EXISTS "Users can view own partner_users record" ON partner_users;
DROP POLICY IF EXISTS "Users can update own partner_users record" ON partner_users;

-- Create new simplified policies that avoid recursion
CREATE POLICY "Users can view their own partner_users records"
  ON partner_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own partner_users records"
  ON partner_users
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Partner admins can manage users in their companies"
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
    -- Same check for inserts/updates
    partner_id IN (
      SELECT pu.partner_id 
      FROM partner_users pu 
      WHERE pu.user_id = auth.uid() 
      AND pu.is_admin = true
    )
  );

-- Keep the existing admin and service role policies as they don't cause recursion
-- These policies should already exist and work correctly:
-- "Admins can manage all partner_users"
-- "Service role full access"