/*
  # Fix production_batches foreign key constraint

  1. Changes
     - Drops the existing foreign key constraint that points to the recipes table
     - Adds a new constraint that points to the products table instead
     - Adds a comment explaining the change

  This migration fixes the issue where production_batches.recipe_id was incorrectly
  referencing the recipes table instead of the products table, which was causing
  errors when trying to add new production batches.
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