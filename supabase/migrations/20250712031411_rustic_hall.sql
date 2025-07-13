/*
  # Fix production permissions and add menu permissions

  1. Changes
    - Add permissions column to profiles table
    - Fix RLS policies for production_batches table
    - Fix RLS policies for production_steps table
    - Translate allergen and category names to Hungarian
*/

-- Add permissions column to profiles if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'permissions'
  ) THEN
    ALTER TABLE profiles ADD COLUMN permissions text[] DEFAULT '{}' COMMENT 'Additional menu permissions beyond role-based access';
  END IF;
END $$;

-- Drop existing policies on production_batches
DROP POLICY IF EXISTS "Allow admins to access all production batches" ON production_batches;
DROP POLICY IF EXISTS "Allow authenticated users" ON production_batches;
DROP POLICY IF EXISTS "Allow bakers and admins to manage production batches" ON production_batches;
DROP POLICY IF EXISTS "Everyone can read production_batches" ON production_batches;
DROP POLICY IF EXISTS "Users can read own batches" ON production_batches;
DROP POLICY IF EXISTS "Allow current user to update production_batches" ON production_batches;

-- Create simplified policies for production_batches
CREATE POLICY "Authenticated users can manage production batches"
ON production_batches
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Drop existing policies on production_steps
DROP POLICY IF EXISTS "Bakers and admins can manage production steps" ON production_steps;
DROP POLICY IF EXISTS "Everyone can read production_steps" ON production_steps;

-- Create simplified policies for production_steps
CREATE POLICY "Authenticated users can manage production steps"
ON production_steps
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Update allergen names to Hungarian
UPDATE products 
SET allergens = ARRAY_REPLACE(allergens, 'gluten', 'glutén')
WHERE 'gluten' = ANY(allergens);

UPDATE products 
SET allergens = ARRAY_REPLACE(allergens, 'dairy', 'tej')
WHERE 'dairy' = ANY(allergens);

UPDATE products 
SET allergens = ARRAY_REPLACE(allergens, 'eggs', 'tojás')
WHERE 'eggs' = ANY(allergens);

UPDATE products 
SET allergens = ARRAY_REPLACE(allergens, 'nuts', 'diófélék')
WHERE 'nuts' = ANY(allergens);

UPDATE products 
SET allergens = ARRAY_REPLACE(allergens, 'peanuts', 'földimogyoró')
WHERE 'peanuts' = ANY(allergens);

UPDATE products 
SET allergens = ARRAY_REPLACE(allergens, 'soy', 'szója')
WHERE 'soy' = ANY(allergens);

UPDATE products 
SET allergens = ARRAY_REPLACE(allergens, 'fish', 'hal')
WHERE 'fish' = ANY(allergens);

UPDATE products 
SET allergens = ARRAY_REPLACE(allergens, 'shellfish', 'rákfélék')
WHERE 'shellfish' = ANY(allergens);

UPDATE products 
SET allergens = ARRAY_REPLACE(allergens, 'sesame', 'szezámmag')
WHERE 'sesame' = ANY(allergens);

-- Update category names to Hungarian
UPDATE products
SET category = 'kenyér'
WHERE category = 'bread';

UPDATE products
SET category = 'sütemény'
WHERE category = 'pastry';

UPDATE products
SET category = 'torta'
WHERE category = 'cake';

UPDATE products
SET category = 'keksz'
WHERE category = 'cookie';

UPDATE products
SET category = 'pizza'
WHERE category = 'pizza';

UPDATE products
SET category = 'szendvics'
WHERE category = 'sandwich';

UPDATE products
SET category = 'egyéb'
WHERE category = 'other';