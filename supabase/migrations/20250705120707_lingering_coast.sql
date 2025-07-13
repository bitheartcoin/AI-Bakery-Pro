/*
  # Fix Production Batches Foreign Key Constraint

  1. Changes
     - Drops the existing foreign key constraint that points to the recipes table
     - Adds a new constraint that points to the products table instead
     - This fixes the error when adding new production batches

  2. Background
     - The application is using the products table for recipes
     - But the foreign key was incorrectly pointing to the recipes table
     - This caused the error: "Key is not present in table recipes"
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