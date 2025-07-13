/*
  # Fix infinite recursion in profiles RLS policies

  1. Problem
    - The error "infinite recursion detected in policy for relation 'profiles'" occurs
    - This happens when a policy for the profiles table references the profiles table itself
    - This creates a circular reference that causes infinite recursion
    
  2. Solution
    - Drop all existing problematic policies on the profiles table
    - Create new, simplified policies that avoid recursion
    - Use direct auth.uid() comparison instead of subqueries where possible
    - For admin policies, use a non-recursive approach
    
  3. Security
    - Maintain the same security model:
      - Users can read and update their own profiles
      - Admins can read and update all profiles
      - Service role has full access
*/

-- Drop all existing policies on profiles to start clean
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin role can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can read basic profile info" ON profiles;
DROP POLICY IF EXISTS "All users can view basic profile info" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can manage employees" ON profiles;
DROP POLICY IF EXISTS "Everyone can read employees" ON profiles;

-- Create simple, non-recursive policies

-- 1. Basic user access to own profile
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 2. Admin access to all profiles
-- This uses a direct role check from auth.jwt() to avoid recursion
CREATE POLICY "Admins can read all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() ->> 'role' = 'admin') OR
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') OR
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() ->> 'role' = 'admin') OR
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') OR
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
  )
  WITH CHECK (
    (auth.jwt() ->> 'role' = 'admin') OR
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') OR
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
  );

CREATE POLICY "Admins can insert profiles"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (auth.jwt() ->> 'role' = 'admin') OR
    (auth.jwt() -> 'app_metadata' ->> 'role' = 'admin') OR
    (auth.jwt() -> 'user_metadata' ->> 'role' = 'admin')
  );

-- 3. Service role access (for system operations)
CREATE POLICY "Service role can manage all profiles"
  ON profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;