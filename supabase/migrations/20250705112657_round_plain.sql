/*
  # Set default password for new users

  1. New Features
    - Adds a trigger to set default password "12345678" for new users
    - Ensures all new users have a consistent initial password
  
  2. Security
    - Uses secure password hashing with bcrypt
    - Only sets password if not already set
*/

-- Create a function to set default password for new users
CREATE OR REPLACE FUNCTION set_default_password()
RETURNS TRIGGER AS $$
BEGIN
  -- Only set password if it's not already set
  IF NEW.encrypted_password IS NULL OR NEW.encrypted_password = '' THEN
    -- Set default password to "12345678"
    NEW.encrypted_password := crypt('12345678', gen_salt('bf'));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to run the function before insert on auth.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_default_password_trigger'
  ) THEN
    CREATE TRIGGER set_default_password_trigger
    BEFORE INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION set_default_password();
  END IF;
END $$;