/*
  # Fix production policies

  1. Security
    - Fix production_batches policies to allow bakers to create and manage batches
    - Add proper RLS policies for all production-related tables
    - Ensure proper access control for all roles
*/

-- Drop existing policies for production_batches
DROP POLICY IF EXISTS "Admins can manage all production batches" ON production_batches;
DROP POLICY IF EXISTS "Bakers can manage all production batches" ON production_batches;
DROP POLICY IF EXISTS "Everyone can read production batches" ON production_batches;
DROP POLICY IF EXISTS "Service role can manage all production batches" ON production_batches;

-- Create new policies for production_batches
CREATE POLICY "Admins can manage all production batches"
ON production_batches
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));

CREATE POLICY "Bakers can manage all production batches"
ON production_batches
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() AND profiles.role = 'baker'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() AND profiles.role = 'baker'
));

CREATE POLICY "Everyone can read production batches"
ON production_batches
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Service role can manage all production batches"
ON production_batches
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Fix production_steps policies
DROP POLICY IF EXISTS "Admins can manage production steps" ON production_steps;
DROP POLICY IF EXISTS "Bakers can manage production steps" ON production_steps;
DROP POLICY IF EXISTS "Everyone can read production steps" ON production_steps;

CREATE POLICY "Admins can manage production steps"
ON production_steps
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
));

CREATE POLICY "Bakers can manage production steps"
ON production_steps
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() AND profiles.role = 'baker'
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() AND profiles.role = 'baker'
));

CREATE POLICY "Everyone can read production steps"
ON production_steps
FOR SELECT
TO authenticated
USING (true);

-- Fix recipe_steps policies
DROP POLICY IF EXISTS "Bakers and admins can manage recipe steps" ON recipe_steps;
DROP POLICY IF EXISTS "Everyone can read recipe_steps" ON recipe_steps;

CREATE POLICY "Bakers and admins can manage recipe steps"
ON recipe_steps
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'baker')
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'baker')
));

CREATE POLICY "Everyone can read recipe_steps"
ON recipe_steps
FOR SELECT
TO authenticated
USING (true);