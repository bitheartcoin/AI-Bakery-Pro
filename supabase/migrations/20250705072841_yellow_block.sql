/*
  # Fix Login Redirect Issues

  1. Changes
    - Ensure all profiles have proper role values
    - Fix any profiles with null roles
    - Add a clear_session_storage function to help with login issues
*/

-- Fix any profiles with null roles
UPDATE profiles
SET role = 'baker'
WHERE role IS NULL;

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

-- Ensure admin users have admin role in both places
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', '"admin"')
WHERE id IN (
    SELECT id FROM profiles WHERE role = 'admin'
);

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