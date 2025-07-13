/*
  # Fix RLS Policy Infinite Recursion

  This migration fixes the infinite recursion issue in Row Level Security policies
  between partner_users and partner_companies tables.

  ## Problem
  The current policies create circular dependencies where:
  - partner_users policies reference partner_companies
  - partner_companies policies reference partner_users
  This creates infinite recursion when querying these tables.

  ## Solution
  1. Drop existing problematic policies
  2. Create simplified policies that break the circular dependency
  3. Use direct user ID checks instead of cross-table references where possible

  ## Changes
  - Simplify partner_companies policies to avoid referencing partner_users
  - Simplify partner_users policies to avoid complex cross-references
  - Use service role for admin operations where needed
*/

-- Drop existing problematic policies on partner_companies
DROP POLICY IF EXISTS "Admins can manage partner_companies" ON partner_companies;
DROP POLICY IF EXISTS "Users can view their partner_companies" ON partner_companies;
DROP POLICY IF EXISTS "Service role full access on partner_companies" ON partner_companies;

-- Drop existing problematic policies on partner_users
DROP POLICY IF EXISTS "Admins can manage partner_users" ON partner_users;
DROP POLICY IF EXISTS "Partner admins can manage company users" ON partner_users;
DROP POLICY IF EXISTS "Users can view own partner_users record" ON partner_users;
DROP POLICY IF EXISTS "Service role full access on partner_users" ON partner_users;

-- Create simplified policies for partner_companies
-- Allow service role full access (for admin operations)
CREATE POLICY "Service role full access on partner_companies"
  ON partner_companies
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to read partner companies (simplified)
CREATE POLICY "Authenticated users can read partner_companies"
  ON partner_companies
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins to manage partner companies (using profiles table directly)
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

-- Create simplified policies for partner_users
-- Allow service role full access (for admin operations)
CREATE POLICY "Service role full access on partner_users"
  ON partner_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow users to view their own partner_users record
CREATE POLICY "Users can view own partner_users record"
  ON partner_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow users to update their own partner_users record
CREATE POLICY "Users can update own partner_users record"
  ON partner_users
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow admins to manage all partner_users (using profiles table directly)
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

-- Allow partner admins to manage users in their company (simplified check)
CREATE POLICY "Partner admins can manage company users"
  ON partner_users
  FOR ALL
  TO authenticated
  USING (
    -- Check if current user is admin of the same partner company
    partner_id IN (
      SELECT pu.partner_id 
      FROM partner_users pu 
      WHERE pu.user_id = auth.uid() 
      AND pu.is_admin = true
    )
  )
  WITH CHECK (
    -- Check if current user is admin of the same partner company
    partner_id IN (
      SELECT pu.partner_id 
      FROM partner_users pu 
      WHERE pu.user_id = auth.uid() 
      AND pu.is_admin = true
    )
  );

-- Update orders policies to avoid recursion
DROP POLICY IF EXISTS "Partner companies can view their orders" ON orders;

-- Create simplified policy for partner orders
CREATE POLICY "Partner companies can view their orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    -- Allow if user is associated with the customer partner company
    customer_id IN (
      SELECT pu.partner_id
      FROM partner_users pu
      WHERE pu.user_id = auth.uid()
    )
  );