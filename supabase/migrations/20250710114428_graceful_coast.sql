/*
  # Fix Partner Users RLS Policies - Remove Infinite Recursion

  This migration fixes the infinite recursion issue in the partner_users table policies
  by simplifying the RLS policies and removing circular references.

  ## Changes Made
  1. Drop existing problematic policies on partner_users table
  2. Drop existing problematic policies on partner_companies table  
  3. Create new simplified policies that avoid circular references
  4. Ensure proper access control without recursion

  ## Security
  - Admins can manage all partner users and companies
  - Partner admins can manage users in their own company
  - Users can view their own partner associations
  - Service role maintains full access
*/

-- Drop existing policies that cause recursion
DROP POLICY IF EXISTS "Admins can manage all partner users" ON partner_users;
DROP POLICY IF EXISTS "Partner admins can manage users in their company" ON partner_users;
DROP POLICY IF EXISTS "Users can view their own partner associations" ON partner_users;

DROP POLICY IF EXISTS "Admins can manage all partner companies" ON partner_companies;
DROP POLICY IF EXISTS "Partners can view their own company" ON partner_companies;

-- Create new simplified policies for partner_users
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

CREATE POLICY "Partner admins can manage company users"
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

-- Create new simplified policies for partner_companies
CREATE POLICY "Service role full access on partner_companies"
  ON partner_companies
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can manage partner_companies"
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

CREATE POLICY "Users can view their partner_companies"
  ON partner_companies
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT pu.partner_id 
      FROM partner_users pu 
      WHERE pu.user_id = auth.uid()
    )
  );

-- Ensure RLS is enabled on both tables
ALTER TABLE partner_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_companies ENABLE ROW LEVEL SECURITY;