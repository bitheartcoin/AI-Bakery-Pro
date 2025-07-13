/*
  # Fix production_batches policies

  1. Security
    - Drop all existing policies on production_batches
    - Create new policies with proper permissions for admins and bakers
    - Fix infinite recursion issue
    - Allow creation of new batches
*/

-- Drop all existing policies on production_batches
DROP POLICY IF EXISTS "Admins can manage all production batches" ON production_batches;
DROP POLICY IF EXISTS "Bakers can manage all production batches" ON production_batches;
DROP POLICY IF EXISTS "Everyone can read production batches" ON production_batches;

-- Create new policies with proper permissions
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

-- Grant service role full access
CREATE POLICY "Service role can manage all production batches"
ON production_batches
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);