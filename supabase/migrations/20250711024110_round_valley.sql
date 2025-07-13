/*
  # Add vehicle damage reports table

  1. New Tables
    - `vehicle_damage_reports`
      - `id` (uuid, primary key)
      - `vehicle_id` (uuid, foreign key to vehicles)
      - `report_date` (date)
      - `description` (text)
      - `location` (text)
      - `reporter_id` (uuid, foreign key to profiles)
      - `status` (text)
      - `images` (text[])
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  2. Security
    - Enable RLS on `vehicle_damage_reports` table
    - Add policy for admins to manage all damage reports
    - Add policy for users to insert their own damage reports
    - Add policy for users to view their own damage reports
*/

-- Create vehicle_damage_reports table
CREATE TABLE IF NOT EXISTS vehicle_damage_reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id uuid NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  report_date date NOT NULL,
  description text NOT NULL,
  location text NOT NULL,
  reporter_id uuid NOT NULL REFERENCES profiles(id),
  status text NOT NULL DEFAULT 'reported',
  images text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add status check constraint
ALTER TABLE vehicle_damage_reports
  ADD CONSTRAINT vehicle_damage_reports_status_check
  CHECK (status IN ('reported', 'in_review', 'approved', 'rejected', 'fixed'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vehicle_damage_reports_vehicle_id ON vehicle_damage_reports(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_damage_reports_reporter_id ON vehicle_damage_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_damage_reports_status ON vehicle_damage_reports(status);

-- Enable RLS
ALTER TABLE vehicle_damage_reports ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all damage reports"
  ON vehicle_damage_reports
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Users can insert their own damage reports"
  ON vehicle_damage_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can view their own damage reports"
  ON vehicle_damage_reports
  FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

-- Create updated_at trigger
CREATE TRIGGER update_vehicle_damage_reports_updated_at
  BEFORE UPDATE ON vehicle_damage_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();