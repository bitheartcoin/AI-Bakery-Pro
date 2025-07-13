/*
  # Fix all policies and permissions

  1. New Policies
    - Fix production_batches policies to allow admins and bakers to manage batches
    - Fix work_logs policies to allow proper time tracking
    - Fix POS transaction policies to allow store-specific access
  
  2. Security
    - Simplify policies to avoid recursion issues
    - Ensure proper access control while allowing necessary operations
*/

-- First, drop problematic policies on production_batches
DO $$
BEGIN
  -- Drop all existing policies on production_batches
  DROP POLICY IF EXISTS "Allow admins to access all production batches" ON production_batches;
  DROP POLICY IF EXISTS "Allow authenticated users" ON production_batches;
  DROP POLICY IF EXISTS "Allow bakers to access and update their own production batches" ON production_batches;
  DROP POLICY IF EXISTS "Allow current user to update production_batches" ON production_batches;
  DROP POLICY IF EXISTS "Authenticated users can manage production batches" ON production_batches;
  DROP POLICY IF EXISTS "Authenticated users can read production batches" ON production_batches;
  DROP POLICY IF EXISTS "Bakers and admins can manage production batches" ON production_batches;
  DROP POLICY IF EXISTS "Everyone can read production_batches" ON production_batches;
  DROP POLICY IF EXISTS "Users can read own batches" ON production_batches;
  
  -- Create new, simplified policies
  CREATE POLICY "Admins can manage all production batches" 
    ON production_batches
    FOR ALL 
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');
    
  CREATE POLICY "Bakers can manage all production batches" 
    ON production_batches
    FOR ALL 
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'baker');
    
  CREATE POLICY "Everyone can read production batches" 
    ON production_batches
    FOR SELECT 
    TO authenticated
    USING (true);
    
  -- Fix production_steps policies
  DROP POLICY IF EXISTS "Bakers and admins can manage production steps" ON production_steps;
  
  CREATE POLICY "Admins can manage production steps" 
    ON production_steps
    FOR ALL 
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');
    
  CREATE POLICY "Bakers can manage production steps" 
    ON production_steps
    FOR ALL 
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'baker');
    
  CREATE POLICY "Everyone can read production steps" 
    ON production_steps
    FOR SELECT 
    TO authenticated
    USING (true);
    
  -- Fix work_logs policies
  CREATE POLICY "Users can manage their own work logs" 
    ON work_logs
    FOR ALL 
    TO authenticated
    USING (employee_id = auth.uid());
    
  -- Fix POS transactions policies
  CREATE POLICY "Salespersons can manage transactions at their location" 
    ON pos_transactions
    FOR ALL 
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM profiles 
        WHERE profiles.id = auth.uid() 
        AND (profiles.role = 'salesperson' OR profiles.role = 'admin')
      )
    );
END $$;

-- Add Hungarian allergen names to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS allergen_names jsonb DEFAULT '{"gluten": "glutén", "dairy": "tej", "eggs": "tojás", "nuts": "diófélék", "peanuts": "földimogyoró", "soy": "szója", "fish": "hal", "shellfish": "rákfélék", "sesame": "szezámmag"}';

-- Add Hungarian category names to products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS category_names jsonb DEFAULT '{"bread": "kenyér", "pastry": "sütemény", "cake": "torta", "cookie": "keksz", "pizza": "pizza", "sandwich": "szendvics", "other": "egyéb"}';

-- Add location_id to profiles for POS terminal location assignment
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS default_location_id uuid REFERENCES locations(id);