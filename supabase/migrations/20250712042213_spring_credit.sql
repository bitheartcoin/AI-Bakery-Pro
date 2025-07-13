/*
  # Fix production batch policies

  1. Security
    - Drop all existing policies on production_batches
    - Create new policies that allow admins and bakers to manage production batches
    - Fix infinite recursion issues
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage all production batches" ON production_batches;
DROP POLICY IF EXISTS "Bakers can manage all production batches" ON production_batches;
DROP POLICY IF EXISTS "Everyone can read production batches" ON production_batches;

-- Create new policies without recursion
CREATE POLICY "Admins can manage all production batches"
ON production_batches
FOR ALL
TO authenticated
USING (auth.jwt() ->> 'role' = 'admin')
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Bakers can manage all production batches"
ON production_batches
FOR ALL
TO authenticated
USING (auth.jwt() ->> 'role' = 'baker')
WITH CHECK (auth.jwt() ->> 'role' = 'baker');

CREATE POLICY "Everyone can read production batches"
ON production_batches
FOR SELECT
TO authenticated
USING (true);

-- Drop existing policies on production_steps
DROP POLICY IF EXISTS "Admins can manage production steps" ON production_steps;
DROP POLICY IF EXISTS "Bakers can manage production steps" ON production_steps;
DROP POLICY IF EXISTS "Everyone can read production steps" ON production_steps;
DROP POLICY IF EXISTS "Everyone can read production_steps" ON production_steps;

-- Create new policies for production_steps
CREATE POLICY "Admins can manage production steps"
ON production_steps
FOR ALL
TO authenticated
USING (auth.jwt() ->> 'role' = 'admin')
WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Bakers can manage production steps"
ON production_steps
FOR ALL
TO authenticated
USING (auth.jwt() ->> 'role' = 'baker')
WITH CHECK (auth.jwt() ->> 'role' = 'baker');

CREATE POLICY "Everyone can read production steps"
ON production_steps
FOR SELECT
TO authenticated
USING (true);