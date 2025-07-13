/*
  # Fix profiles RLS policies to prevent infinite recursion

  1. Security
    - Drop existing problematic policies that cause infinite recursion
    - Create new simplified policies for the profiles table
    - Enable RLS on profiles table
*/

-- First, enable RLS on the profiles table (in case it was disabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies on the profiles table to start fresh
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "Everyone can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create new, simplified policies that avoid recursion

-- Allow users to read all profiles
CREATE POLICY "Everyone can read profiles" 
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" 
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Allow admins to manage all profiles
-- This uses a simple check on the user's role in the JWT claims to avoid recursion
CREATE POLICY "Admins can manage all profiles" 
ON public.profiles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.jwt() 
    WHERE (auth.jwt() ->> 'role')::text = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.jwt() 
    WHERE (auth.jwt() ->> 'role')::text = 'admin'
  )
);

-- Allow service role full access
CREATE POLICY "Service role can manage all profiles" 
ON public.profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);