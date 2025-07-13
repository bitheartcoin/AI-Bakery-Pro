-- Fix profile issues and add missing columns

-- Add missing columns to profiles table if they don't exist
DO $$
BEGIN
  -- Add salary column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'salary'
  ) THEN
    ALTER TABLE profiles ADD COLUMN salary numeric(10,2);
  END IF;

  -- Add hire_date column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'hire_date'
  ) THEN
    ALTER TABLE profiles ADD COLUMN hire_date date DEFAULT CURRENT_DATE;
  END IF;

  -- Add bank_account column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'bank_account'
  ) THEN
    ALTER TABLE profiles ADD COLUMN bank_account text;
  END IF;

  -- Add tax_number column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'tax_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN tax_number text;
  END IF;

  -- Add social_security_number column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'social_security_number'
  ) THEN
    ALTER TABLE profiles ADD COLUMN social_security_number text;
  END IF;

  -- Add mother_name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'mother_name'
  ) THEN
    ALTER TABLE profiles ADD COLUMN mother_name text;
  END IF;
END $$;

-- Create work_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS work_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid NOT NULL REFERENCES profiles(id),
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  duration integer,
  status text DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT work_logs_status_check CHECK (status IN ('active', 'completed', 'cancelled'))
);

-- Create indexes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_work_logs_employee_id'
  ) THEN
    CREATE INDEX idx_work_logs_employee_id ON work_logs(employee_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_work_logs_start_time'
  ) THEN
    CREATE INDEX idx_work_logs_start_time ON work_logs(start_time);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_work_logs_status'
  ) THEN
    CREATE INDEX idx_work_logs_status ON work_logs(status);
  END IF;
END $$;

-- Enable RLS on work_logs table
ALTER TABLE work_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for work_logs table
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can read own work logs" ON work_logs;
  DROP POLICY IF EXISTS "Users can insert own work logs" ON work_logs;
  DROP POLICY IF EXISTS "Users can update own work logs" ON work_logs;
  DROP POLICY IF EXISTS "Admins can manage all work logs" ON work_logs;
  
  -- Create new policies
  CREATE POLICY "Users can read own work logs"
    ON work_logs
    FOR SELECT
    TO authenticated
    USING (employee_id = auth.uid());
  
  CREATE POLICY "Users can insert own work logs"
    ON work_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (employee_id = auth.uid());
  
  CREATE POLICY "Users can update own work logs"
    ON work_logs
    FOR UPDATE
    TO authenticated
    USING (employee_id = auth.uid());
  
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
END $$;

-- Create trigger for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_work_logs_updated_at'
  ) THEN
    CREATE TRIGGER update_work_logs_updated_at
    BEFORE UPDATE ON work_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Fix profiles RLS policies
DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
  DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
  DROP POLICY IF EXISTS "Admins can insert profiles" ON profiles;
  
  -- Create new policies
  CREATE POLICY "Users can read own profile"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());
  
  CREATE POLICY "Users can update own profile"
    ON profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());
  
  CREATE POLICY "Admins can read all profiles"
    ON profiles
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
      )
    );
  
  CREATE POLICY "Admins can update all profiles"
    ON profiles
    FOR UPDATE
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
      )
    );
  
  CREATE POLICY "Admins can insert profiles"
    ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() 
        AND profiles.role = 'admin'
      )
    );
END $$;

-- Create admin user if it doesn't exist
DO $$
DECLARE
  admin_exists boolean;
  admin_id uuid;
BEGIN
  -- Check if admin user exists
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = 'admin@szemesipekseg.hu'
  ) INTO admin_exists;
  
  IF NOT admin_exists THEN
    -- Create admin user
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@szemesipekseg.hu',
      crypt('admin123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"role": "admin", "full_name": "Admin Felhasználó"}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO admin_id;
    
    -- Create admin profile
    IF admin_id IS NOT NULL THEN
      INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        status,
        created_at,
        updated_at
      )
      VALUES (
        admin_id,
        'admin@szemesipekseg.hu',
        'Admin Felhasználó',
        'admin',
        'active',
        now(),
        now()
      );
    END IF;
  END IF;
END $$;