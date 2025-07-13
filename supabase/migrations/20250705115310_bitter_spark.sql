/*
  # Fix production_batches foreign key constraint

  1. Changes
     - Modify the foreign key constraint on production_batches.recipe_id to reference products(id) instead of recipes(id)
     - This fixes the error when adding new production batches
  
  2. Background
     - The application is using the products table for recipes, but the foreign key constraint is pointing to the recipes table
     - This causes an error when trying to add a new production batch
*/

-- First, drop the existing foreign key constraint
ALTER TABLE production_batches DROP CONSTRAINT IF EXISTS production_batches_recipe_id_fkey;

-- Then add the new constraint pointing to the products table
ALTER TABLE production_batches 
  ADD CONSTRAINT production_batches_recipe_id_fkey 
  FOREIGN KEY (recipe_id) 
  REFERENCES products(id);

-- Add a comment explaining the change
COMMENT ON CONSTRAINT production_batches_recipe_id_fkey ON production_batches IS 
  'Foreign key constraint linking production_batches.recipe_id to products.id instead of recipes.id';