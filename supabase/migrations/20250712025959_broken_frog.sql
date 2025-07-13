/*
  # Add permissions to profiles table
  
  1. New Columns
    - `permissions` (text[] array) to store additional menu permissions
  2. Changes
    - Add permissions column to profiles table to store additional menu access permissions
*/

-- Add permissions column to profiles table
ALTER TABLE IF EXISTS public.profiles 
ADD COLUMN IF NOT EXISTS permissions text[] DEFAULT '{}';

-- Add comment to explain the purpose of the column
COMMENT ON COLUMN public.profiles.permissions IS 'Additional menu permissions beyond the user''s role';