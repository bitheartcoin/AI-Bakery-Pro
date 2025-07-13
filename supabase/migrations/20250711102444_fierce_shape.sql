/*
  # Create Recipe Steps Table

  1. New Tables
    - `recipe_steps`
      - `id` (uuid, primary key)
      - `recipe_id` (uuid, foreign key to recipes)
      - `step_number` (integer)
      - `title` (text)
      - `description` (text)
      - `duration_minutes` (integer)
      - `temperature` (integer)
      - `humidity` (integer)
      - `equipment` (text[])
      - `ingredients` (jsonb)
      - `notes` (text)
      - `created_at` (timestamp)
  2. Security
    - Enable RLS on `recipe_steps` table
    - Add policies for admins and bakers
*/

-- Create recipe steps table
CREATE TABLE IF NOT EXISTS recipe_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  duration_minutes integer DEFAULT 0,
  temperature integer,
  humidity integer,
  equipment text[],
  ingredients jsonb DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_recipe_steps_recipe_id ON recipe_steps(recipe_id);

-- Enable Row Level Security
ALTER TABLE recipe_steps ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Bakers and admins can manage recipe steps"
  ON recipe_steps
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'baker')
  ));

CREATE POLICY "Everyone can read recipe_steps"
  ON recipe_steps
  FOR SELECT
  TO authenticated
  USING (true);