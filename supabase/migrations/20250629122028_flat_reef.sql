-- Drop all existing policies on profiles to start clean
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Admin role can manage all profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can read basic profile info" ON profiles;
DROP POLICY IF EXISTS "All users can view basic profile info" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can manage employees" ON profiles;
DROP POLICY IF EXISTS "Everyone can read employees" ON profiles;

-- Create simple, non-recursive policies

-- 1. Allow all users to read all profiles (this is needed for the admin menu to work)
CREATE POLICY "Everyone can read profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 3. Allow admins to manage all profiles
-- This uses a direct role check from the profile table
CREATE POLICY "Admins can manage profiles"
  ON profiles
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'admin'
    )
  );

-- 4. Service role access (for system operations)
CREATE POLICY "Service role can manage all profiles"
  ON profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;