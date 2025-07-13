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

-- Create vehicle_damage_reports table if it doesn't exist
CREATE TABLE IF NOT EXISTS vehicle_damage_reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  report_date date NOT NULL,
  description text NOT NULL,
  location text NOT NULL,
  reporter_id uuid NOT NULL REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'reported',
  images text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT vehicle_damage_reports_status_check CHECK (status IN ('reported', 'in_review', 'approved', 'rejected', 'fixed'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_damage_reports_vehicle_id ON vehicle_damage_reports(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_damage_reports_reporter_id ON vehicle_damage_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_damage_reports_status ON vehicle_damage_reports(status);

-- Enable RLS
ALTER TABLE vehicle_damage_reports ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own damage reports"
  ON vehicle_damage_reports
  FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

CREATE POLICY "Users can insert their own damage reports"
  ON vehicle_damage_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Admins can manage all damage reports"
  ON vehicle_damage_reports
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vehicle_damage_reports_updated_at
BEFORE UPDATE ON vehicle_damage_reports
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();