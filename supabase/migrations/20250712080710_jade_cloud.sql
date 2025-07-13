/*
  # Create function to get all tables

  1. New Functions
    - `get_all_tables` - Returns a list of all tables in the public schema
*/

-- Create function to get all tables
CREATE OR REPLACE FUNCTION get_all_tables()
RETURNS TABLE (table_name text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT table_name::text
  FROM information_schema.tables
  WHERE table_schema = 'public'
  ORDER BY table_name;
$$;