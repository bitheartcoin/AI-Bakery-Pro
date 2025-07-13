/*
  # Create advance_requests table

  1. New Tables
    - `advance_requests`
      - `id` (uuid, primary key)
      - `employee_id` (uuid, foreign key to profiles)
      - `amount` (numeric)
      - `reason` (text)
      - `status` (text)
      - `approved_by` (uuid, foreign key to profiles)
      - `approved_at` (timestamp)
      - `location_id` (uuid, foreign key to locations)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `advance_requests` table
    - Add policies for admins and employees
*/

CREATE TABLE IF NOT EXISTS advance_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL DEFAULT 0,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  location_id uuid REFERENCES locations(id),
  created_at timestamptz DEFAULT now()
);

-- Add constraint for status
ALTER TABLE advance_requests ADD CONSTRAINT advance_requests_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected'));

-- Enable Row Level Security
ALTER TABLE advance_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage all advance requests" 
  ON advance_requests
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  ));

CREATE POLICY "Users can view their own advance requests" 
  ON advance_requests
  FOR SELECT
  TO authenticated
  USING (employee_id = auth.uid());

CREATE POLICY "Users can insert their own advance requests" 
  ON advance_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (employee_id = auth.uid());

-- Create index
CREATE INDEX idx_advance_requests_employee_id ON advance_requests(employee_id);
CREATE INDEX idx_advance_requests_status ON advance_requests(status);