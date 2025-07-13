/*
  # Fix Production Batches Foreign Key Constraint

  1. Changes
    - Drops the existing foreign key constraint that incorrectly points to the `recipes` table
    - Adds a new constraint that correctly points to the `products` table
    - Adds a comment explaining the change

  This migration fixes the issue where production batches were trying to reference recipes
  but should actually be referencing products.
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