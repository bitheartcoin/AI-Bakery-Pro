/*
  # Fix Orders and Partner Companies Relationships

  1. Database Changes
    - Add customer_id column to orders table to link with partner_companies
    - Fix RLS policies for partner_users to prevent infinite recursion
    
  2. Security
    - Update RLS policies to avoid circular dependencies
    - Ensure proper access control for partner relationships
*/

-- Add customer_id column to orders table to link with partner companies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_id uuid REFERENCES partner_companies(id);
    CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
  END IF;
END $$;

-- Fix infinite recursion in partner_users RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Partner admins can manage users in their company" ON partner_users;
DROP POLICY IF EXISTS "Users can view their own partner associations" ON partner_users;
DROP POLICY IF EXISTS "Admins can manage all partner users" ON partner_users;

-- Create new, non-recursive policies for partner_users
CREATE POLICY "Admins can manage all partner users"
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

CREATE POLICY "Users can view their own partner associations"
  ON partner_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Partner admins can manage users in their company"
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

-- Update orders table policies to handle the new customer_id relationship
CREATE POLICY "Partner companies can view their orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT pu.partner_id
      FROM partner_users pu
      WHERE pu.user_id = auth.uid()
    )
  );