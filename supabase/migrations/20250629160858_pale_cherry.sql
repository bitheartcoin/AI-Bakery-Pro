-- Drop existing policies that reference the users table incorrectly
DROP POLICY IF EXISTS "Admins can manage all work logs" ON work_logs;

-- Create new policy for admins using the profiles table
CREATE POLICY "Admins can manage all work logs"
  ON work_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Ensure the existing user policy is correct (users can manage their own work logs)
-- This policy should already exist and be correct, but let's recreate it to be sure
DROP POLICY IF EXISTS "Users can manage own work logs" ON work_logs;

CREATE POLICY "Users can manage own work logs"
  ON work_logs
  FOR ALL
  TO authenticated
  USING (employee_id = auth.uid())
  WITH CHECK (employee_id = auth.uid());

-- Ensure service role policy exists for system operations
DROP POLICY IF EXISTS "Service role can manage all work logs" ON work_logs;

CREATE POLICY "Service role can manage all work logs"
  ON work_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);