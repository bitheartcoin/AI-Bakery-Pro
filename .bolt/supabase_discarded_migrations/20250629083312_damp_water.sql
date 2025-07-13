-- Create feedback table if it doesn't exist
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id),
  message text NOT NULL,
  status text DEFAULT 'pending',
  admin_response text,
  responded_by uuid REFERENCES profiles(id),
  responded_at timestamptz,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT feedback_status_check CHECK (status IN ('pending', 'in_progress', 'resolved', 'rejected'))
);

-- Create indexes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_feedback_user_id'
  ) THEN
    CREATE INDEX idx_feedback_user_id ON feedback(user_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'idx_feedback_status'
  ) THEN
    CREATE INDEX idx_feedback_status ON feedback(status);
  END IF;
END $$;

-- Enable RLS on feedback table
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Create policies for feedback table
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Users can manage their own feedback" ON feedback;
  DROP POLICY IF EXISTS "Admins can manage all feedback" ON feedback;
  
  -- Create new policies
  CREATE POLICY "Users can manage their own feedback"
    ON feedback
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid());
  
  CREATE POLICY "Admins can manage all feedback"
    ON feedback
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