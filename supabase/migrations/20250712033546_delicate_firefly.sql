/*
  # Fix infinite recursion in production_batches policy

  1. Changes
    - Drop all existing policies on production_batches
    - Create new, simplified policies without recursion
    - Allow admins and bakers to manage production batches
    - Allow authenticated users to read production batches
*/

-- First, drop all existing policies on production_batches
DO $$
BEGIN
  -- Drop all policies on production_batches
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'production_batches'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON production_batches', r.policyname);
  END LOOP;
END
$$;

-- Create new, simplified policies
CREATE POLICY "Admins can manage all production batches" 
ON production_batches 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'admin'
  )
);

CREATE POLICY "Bakers can manage production batches" 
ON production_batches 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'baker'
  )
);

CREATE POLICY "Authenticated users can read production batches" 
ON production_batches 
FOR SELECT 
TO authenticated 
USING (true);