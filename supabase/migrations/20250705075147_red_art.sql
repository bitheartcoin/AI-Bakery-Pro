-- Fix any profiles with null roles
UPDATE profiles
SET role = 'baker'
WHERE role IS NULL;

-- Ensure admin users have admin role in both places
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', '"admin"')
WHERE id IN (
    SELECT id FROM profiles WHERE role = 'admin'
);

-- Create a function to clear session storage
CREATE OR REPLACE FUNCTION clear_session_storage()
RETURNS void AS $$
BEGIN
    -- This function doesn't actually modify the database
    -- It's a placeholder for client-side functionality
    RAISE NOTICE 'Session storage clear function created';
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to the authenticated role
GRANT EXECUTE ON FUNCTION clear_session_storage() TO authenticated;

-- Create a function to force logout all users (for admin use)
CREATE OR REPLACE FUNCTION force_logout_all_users()
RETURNS void AS $$
BEGIN
    -- This is a placeholder function
    -- In a real implementation, this would invalidate all sessions
    RAISE NOTICE 'Force logout function created';
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to the authenticated role
GRANT EXECUTE ON FUNCTION force_logout_all_users() TO authenticated;

-- Fix RLS policies for profiles table
DO $$
BEGIN
  -- Drop existing policies that might be causing conflicts
  DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
  DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
  DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
  DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;
  DROP POLICY IF EXISTS "Service role can manage all profiles" ON profiles;
  DROP POLICY IF EXISTS "Everyone can read profiles" ON profiles;
  DROP POLICY IF EXISTS "Admins can manage profiles" ON profiles;
  
  -- Create new, simplified policies
  CREATE POLICY "Everyone can read profiles"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (true);
  
  CREATE POLICY "Users can update own profile"
    ON profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());
  
  -- Check if policy exists before creating it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Admins can manage profiles'
  ) THEN
    CREATE POLICY "Admins can manage profiles"
      ON profiles
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      );
  END IF;
  
  -- Check if policy exists before creating it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Service role can manage all profiles'
  ) THEN
    CREATE POLICY "Service role can manage all profiles"
      ON profiles
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Create a function to check if a user session is valid
CREATE OR REPLACE FUNCTION is_session_valid(session_id uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM auth.sessions 
        WHERE id = session_id AND expires_at > now()
    );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to the authenticated role
GRANT EXECUTE ON FUNCTION is_session_valid(uuid) TO authenticated;