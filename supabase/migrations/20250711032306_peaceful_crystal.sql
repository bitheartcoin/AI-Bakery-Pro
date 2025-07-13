/*
  # Fix recipe_steps foreign key constraint

  1. Changes
    - Drop the existing foreign key constraint on recipe_steps.recipe_id
    - Add a new foreign key constraint that references products.id instead of recipes.id
    - This allows recipe steps to be associated with products directly
*/

-- First, drop the existing foreign key constraint
ALTER TABLE recipe_steps
DROP CONSTRAINT IF EXISTS recipe_steps_recipe_id_fkey;

-- Add the new foreign key constraint referencing products.id
ALTER TABLE recipe_steps
ADD CONSTRAINT recipe_steps_recipe_id_fkey
FOREIGN KEY (recipe_id) REFERENCES products(id) ON DELETE CASCADE;

-- Add a comment to explain the change
COMMENT ON CONSTRAINT recipe_steps_recipe_id_fkey ON recipe_steps IS 
'Foreign key constraint linking recipe_steps.recipe_id to products.id instead of recipes.id';