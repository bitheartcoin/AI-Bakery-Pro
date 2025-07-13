/*
  # Add partner role to profiles table

  1. Changes
    - Update the check constraint on profiles.role to include 'partner' role
*/

-- Update the check constraint to include 'partner' role
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role = ANY (ARRAY['admin'::text, 'baker'::text, 'salesperson'::text, 'driver'::text, 'partner'::text]));