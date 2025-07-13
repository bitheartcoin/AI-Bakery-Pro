/*
  # Create Production Steps Table

  1. New Tables
    - `production_steps`
      - `id` (uuid, primary key)
      - `batch_id` (uuid, foreign key to production_batches)
      - `step_id` (uuid, foreign key to recipe_steps)
      - `status` (text)
      - `start_time` (timestamp)
      - `end_time` (timestamp)
      - `actual_temperature` (numeric)
      - `actual_humidity` (numeric)
      - `notes` (text)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `production_steps` table
    - Add policies for admins and bakers
*/

-- Create production steps table
CREATE TABLE IF NOT EXISTS production_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES recipe_steps(id),
  status text NOT NULL DEFAULT 'pending',
  start_time timestamptz,
  end_time timestamptz,
  actual_temperature numeric(5,2),
  actual_humidity numeric(5,2),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_production_steps_batch_id ON production_steps(batch_id);

-- Add status check constraint
ALTER TABLE production_steps ADD CONSTRAINT production_steps_status_check 
  CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped'));

-- Enable Row Level Security
ALTER TABLE production_steps ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Bakers and admins can manage production steps"
  ON production_steps
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'baker')
  ));

CREATE POLICY "Everyone can read production_steps"
  ON production_steps
  FOR SELECT
  TO authenticated
  USING (true);