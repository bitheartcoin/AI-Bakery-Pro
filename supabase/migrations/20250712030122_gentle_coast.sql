/*
  # Add permissions column to profiles table

  1. Changes
     - Add permissions column to profiles table to store additional menu access permissions
*/

-- Add permissions column to profiles table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'permissions'
  ) THEN
    ALTER TABLE profiles ADD COLUMN permissions text[] DEFAULT '{}';
  END IF;
END $$;

-- Add comment to explain the purpose of the column
COMMENT ON COLUMN profiles.permissions IS 'Additional menu permissions beyond role-based access';