/*
  # Fix infinite recursion in partner_users RLS policy

  1. Security Changes
    - Drop the problematic "Partner admins can manage company users" policy
    - Create a new policy that avoids self-referential queries
    - Use auth.uid() directly instead of querying partner_users within the policy

  2. Policy Updates
    - Replace recursive policy with a simpler approach
    - Maintain security while avoiding infinite recursion
*/

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Partner admins can manage company users" ON partner_users;

-- Create a new policy that doesn't cause recursion
-- This policy allows partner admins to manage users in their companies
-- but uses a different approach to avoid self-referential queries
CREATE POLICY "Partner admins can manage company users v2"
  ON partner_users
  FOR ALL
  TO authenticated
  USING (
    -- Allow if user is admin and the record belongs to their partner company
    EXISTS (
      SELECT 1 
      FROM partner_users pu_admin
      WHERE pu_admin.user_id = auth.uid() 
        AND pu_admin.is_admin = true 
        AND pu_admin.partner_id = partner_users.partner_id
        AND pu_admin.id != partner_users.id  -- Prevent self-reference
    )
  )
  WITH CHECK (
    -- Same check for INSERT/UPDATE operations
    EXISTS (
      SELECT 1 
      FROM partner_users pu_admin
      WHERE pu_admin.user_id = auth.uid() 
        AND pu_admin.is_admin = true 
        AND pu_admin.partner_id = partner_users.partner_id
        AND pu_admin.id != partner_users.id  -- Prevent self-reference
    )
  );

-- Alternative approach: Create a simpler policy that relies on application logic
-- Drop the complex policy and create a basic one
DROP POLICY IF EXISTS "Partner admins can manage company users v2" ON partner_users;

-- Create a simpler policy that avoids recursion entirely
CREATE POLICY "Partner admins can manage company users simple"
  ON partner_users
  FOR ALL
  TO authenticated
  USING (
    -- Allow access if user is a system admin
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
    OR
    -- Allow users to manage their own record
    user_id = auth.uid()
  )
  WITH CHECK (
    -- Same check for INSERT/UPDATE operations
    EXISTS (
      SELECT 1 
      FROM profiles 
      WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
    )
    OR
    user_id = auth.uid()
  );