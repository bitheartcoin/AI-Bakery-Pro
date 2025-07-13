/*
  # Fix production_batches foreign key constraint

  1. Changes
     - Drop the existing foreign key constraint on production_batches.recipe_id
     - Add a new constraint that correctly points to the products table instead of recipes
     
  2. Reason
     - The original constraint was incorrectly pointing to recipes table
     - Production batches should reference products instead
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