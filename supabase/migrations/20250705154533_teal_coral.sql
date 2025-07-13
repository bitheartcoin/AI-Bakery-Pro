/*
  # Add production steps tables

  1. New Tables
    - Create production_steps table for tracking production steps
    - Create recipe_steps table for storing recipe steps
    - Set up proper relationships between tables
    - Add RLS policies for security
    
  2. Schema
    - production_steps: Tracks the execution of recipe steps for a specific batch
    - recipe_steps: Stores the steps for each recipe
*/

-- Create production_steps table if it doesn't exist
CREATE TABLE IF NOT EXISTS production_steps (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  batch_id uuid NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
  step_id uuid NOT NULL REFERENCES recipe_steps(id),
  status text DEFAULT 'pending',
  start_time timestamptz,
  end_time timestamptz,
  actual_temperature numeric(5,2),
  actual_humidity numeric(5,2),
  notes text,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT production_steps_status_check CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped'))
);

-- Create index on batch_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_production_steps_batch_id ON production_steps(batch_id);

-- Enable RLS
ALTER TABLE production_steps ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$
BEGIN
  -- Check if policy exists before creating it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'production_steps' AND policyname = 'Bakers and admins can manage production steps'
  ) THEN
    CREATE POLICY "Bakers and admins can manage production steps"
      ON production_steps
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = ANY (ARRAY['admin', 'baker'])
        )
      );
  END IF;

  -- Check if policy exists before creating it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'production_steps' AND policyname = 'Everyone can read production_steps'
  ) THEN
    CREATE POLICY "Everyone can read production_steps"
      ON production_steps
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Create recipe_steps table if it doesn't exist
CREATE TABLE IF NOT EXISTS recipe_steps (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  duration_minutes integer DEFAULT 0,
  temperature integer,
  humidity integer,
  equipment text[],
  ingredients jsonb DEFAULT '[]',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create index on recipe_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_recipe_steps_recipe_id ON recipe_steps(recipe_id);

-- Enable RLS
ALTER TABLE recipe_steps ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$
BEGIN
  -- Check if policy exists before creating it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'recipe_steps' AND policyname = 'Bakers and admins can manage recipe steps'
  ) THEN
    CREATE POLICY "Bakers and admins can manage recipe steps"
      ON recipe_steps
      FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = ANY (ARRAY['admin', 'baker'])
        )
      );
  END IF;

  -- Check if policy exists before creating it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'recipe_steps' AND policyname = 'Everyone can read recipe_steps'
  ) THEN
    CREATE POLICY "Everyone can read recipe_steps"
      ON recipe_steps
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;