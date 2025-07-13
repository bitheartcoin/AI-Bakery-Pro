-- Drop existing policies that might be causing recursion
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON public.profiles;

-- Create new policies without recursion
CREATE POLICY "Users can read own profile" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Add policy for admins to read all profiles (non-recursive)
CREATE POLICY "Admins can read all profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Add policy for admins to update all profiles (non-recursive)
CREATE POLICY "Admins can update all profiles" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Service role can manage all profiles
CREATE POLICY "Service role can manage all profiles" 
ON public.profiles FOR ALL 
TO service_role 
USING (true)
WITH CHECK (true);

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