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

-- Update RLS policies to allow users to access their own permissions
CREATE POLICY "Users can update own permissions" 
ON public.profiles
FOR UPDATE 
TO authenticated
USING (id = uid())
WITH CHECK (id = uid());