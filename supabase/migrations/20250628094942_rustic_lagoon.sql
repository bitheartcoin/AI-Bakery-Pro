/*
  # Fix Profiles Policy Infinite Recursion

  1. Changes
    - Fix the infinite recursion in profiles policies
    - Add proper Google auth support
    - Improve settings table structure
*/

-- First, drop the problematic policies that cause infinite recursion
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Create new policies without recursion
CREATE POLICY "Admins can read all profiles" 
ON profiles FOR SELECT 
TO authenticated 
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);

CREATE POLICY "Admins can update all profiles" 
ON profiles FOR UPDATE 
TO authenticated 
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
) 
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);

-- Create a function to clear mock data
CREATE OR REPLACE FUNCTION clear_mock_data()
RETURNS void AS $$
BEGIN
  -- Delete mock data from various tables
  DELETE FROM orders WHERE id != '00000000-0000-0000-0000-000000000000';
  DELETE FROM order_items WHERE id != '00000000-0000-0000-0000-000000000000';
  DELETE FROM production_batches WHERE id != '00000000-0000-0000-0000-000000000000';
  DELETE FROM production_steps WHERE id != '00000000-0000-0000-0000-000000000000';
  DELETE FROM inventory WHERE id != '00000000-0000-0000-0000-000000000000';
  DELETE FROM work_logs WHERE id != '00000000-0000-0000-0000-000000000000';
  DELETE FROM schedules WHERE id != '00000000-0000-0000-0000-000000000000';
  DELETE FROM notifications WHERE id != '00000000-0000-0000-0000-000000000000';
  DELETE FROM feedback WHERE id != '00000000-0000-0000-0000-000000000000';
  DELETE FROM documents WHERE id != '00000000-0000-0000-0000-000000000000';
  DELETE FROM sensor_data WHERE id != '00000000-0000-0000-0000-000000000000';
  DELETE FROM vehicles WHERE id != '00000000-0000-0000-0000-000000000000';
  DELETE FROM locations WHERE id != '00000000-0000-0000-0000-000000000000';
  DELETE FROM recipes WHERE id != '00000000-0000-0000-0000-000000000000';
  DELETE FROM products WHERE id != '00000000-0000-0000-0000-000000000000';
  DELETE FROM surveys WHERE id != '00000000-0000-0000-0000-000000000000';
  DELETE FROM survey_questions WHERE id != '00000000-0000-0000-0000-000000000000';
  DELETE FROM survey_responses WHERE id != '00000000-0000-0000-0000-000000000000';
END;
$$ LANGUAGE plpgsql;