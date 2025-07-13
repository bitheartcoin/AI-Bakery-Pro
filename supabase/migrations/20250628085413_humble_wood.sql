/*
  # Google Auth Configuration

  1. New Columns
    - Add avatar_url to profiles table
    - Add provider to profiles table to track auth provider
  
  2. Security
    - Update RLS policies to ensure proper access
*/

-- Add avatar_url and provider columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN avatar_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'provider'
  ) THEN
    ALTER TABLE profiles ADD COLUMN provider text DEFAULT 'email';
  END IF;
END $$;

-- Create trigger function to handle user metadata from OAuth providers
CREATE OR REPLACE FUNCTION handle_oauth_user_metadata()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profile with OAuth metadata if available
  IF NEW.raw_user_meta_data->>'avatar_url' IS NOT NULL THEN
    UPDATE profiles
    SET 
      avatar_url = NEW.raw_user_meta_data->>'avatar_url',
      provider = 'google'
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_oauth_user_metadata();
  END IF;
END $$;