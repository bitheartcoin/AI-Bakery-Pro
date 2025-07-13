/*
  # Fix recipe_steps foreign key constraint

  1. Changes
    - Modify the foreign key constraint on recipe_steps to reference products table instead of recipes
    - This allows recipe steps to be created for products directly
*/

-- Drop the existing foreign key constraint
ALTER TABLE recipe_steps DROP CONSTRAINT IF EXISTS recipe_steps_recipe_id_fkey;

-- Add the new foreign key constraint referencing products table
ALTER TABLE recipe_steps ADD CONSTRAINT recipe_steps_recipe_id_fkey 
  FOREIGN KEY (recipe_id) REFERENCES products(id) ON DELETE CASCADE;

-- Update RLS policies to allow access to recipe steps
ALTER TABLE recipe_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bakers and admins can manage recipe steps"
  ON recipe_steps
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'baker')
  ));

CREATE POLICY "Everyone can read recipe_steps"
  ON recipe_steps
  FOR SELECT
  TO authenticated
  USING (true);