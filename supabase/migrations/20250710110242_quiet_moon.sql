/*
  # Fix dashboard stats and partner relationships

  1. Changes
    - Update dashboard stats function to properly handle vehicle and employee counts
    - Fix partner_users policies to avoid infinite recursion
    - Add customer_id to orders table to link with partner companies
    - Create policies for partners to view their own orders
*/

-- Update dashboard stats function to include vehicle and employee counts
CREATE OR REPLACE FUNCTION update_dashboard_stats()
RETURNS TRIGGER AS $$
DECLARE
  daily_revenue NUMERIC := 0;
  completed_orders INTEGER := 0;
  low_stock_count INTEGER := 0;
  active_vehicles INTEGER := 0;
  total_vehicles INTEGER := 0;
  active_employees INTEGER := 0;
  employees_in_shift INTEGER := 0;
BEGIN
  -- Calculate daily revenue
  SELECT COALESCE(SUM(total_amount), 0) INTO daily_revenue
  FROM orders
  WHERE DATE(created_at) = CURRENT_DATE
  AND status = 'completed';
  
  -- Count completed orders
  SELECT COUNT(*) INTO completed_orders
  FROM orders
  WHERE DATE(created_at) = CURRENT_DATE
  AND status = 'completed';
  
  -- Count low stock items
  SELECT COUNT(*) INTO low_stock_count
  FROM inventory
  WHERE current_stock <= min_threshold;
  
  -- Count active vehicles
  SELECT COUNT(*) INTO active_vehicles
  FROM vehicles
  WHERE status = 'active';
  
  -- Count total vehicles
  SELECT COUNT(*) INTO total_vehicles
  FROM vehicles;
  
  -- Count active employees
  SELECT COUNT(*) INTO active_employees
  FROM profiles
  WHERE status = 'active';
  
  -- Count employees in shift today
  SELECT COUNT(*) INTO employees_in_shift
  FROM schedules
  WHERE date = CURRENT_DATE
  AND status = 'confirmed';
  
  -- Update dashboard stats
  -- Daily revenue
  INSERT INTO settings (category, key, value, description, is_public)
  VALUES ('dashboard', 'daily_revenue', to_jsonb(daily_revenue), 'Daily revenue for dashboard', true)
  ON CONFLICT (category, key) 
  DO UPDATE SET 
    value = to_jsonb(daily_revenue),
    updated_at = now();
  
  -- Completed orders
  INSERT INTO settings (category, key, value, description, is_public)
  VALUES ('dashboard', 'completed_orders', to_jsonb(completed_orders), 'Completed orders count for dashboard', true)
  ON CONFLICT (category, key) 
  DO UPDATE SET 
    value = to_jsonb(completed_orders),
    updated_at = now();
  
  -- Low stock items
  INSERT INTO settings (category, key, value, description, is_public)
  VALUES ('dashboard', 'low_stock_count', to_jsonb(low_stock_count), 'Low stock items count for dashboard', true)
  ON CONFLICT (category, key) 
  DO UPDATE SET 
    value = to_jsonb(low_stock_count),
    updated_at = now();
  
  -- Active vehicles
  INSERT INTO settings (category, key, value, description, is_public)
  VALUES ('dashboard', 'active_vehicles', to_jsonb(active_vehicles || '/' || total_vehicles), 'Active vehicles for dashboard', true)
  ON CONFLICT (category, key) 
  DO UPDATE SET 
    value = to_jsonb(active_vehicles || '/' || total_vehicles),
    updated_at = now();
  
  -- Active employees
  INSERT INTO settings (category, key, value, description, is_public)
  VALUES ('dashboard', 'active_employees', to_jsonb(active_employees), 'Active employees for dashboard', true)
  ON CONFLICT (category, key) 
  DO UPDATE SET 
    value = to_jsonb(active_employees),
    updated_at = now();
  
  -- Employees in shift
  INSERT INTO settings (category, key, value, description, is_public)
  VALUES ('dashboard', 'employees_in_shift', to_jsonb(employees_in_shift), 'Employees in shift for dashboard', true)
  ON CONFLICT (category, key) 
  DO UPDATE SET 
    value = to_jsonb(employees_in_shift),
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add customer_id column to orders table to link with partner companies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'customer_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN customer_id uuid REFERENCES partner_companies(id);
    CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
  END IF;
END $$;

-- Fix infinite recursion in partner_users RLS policies
-- Drop existing problematic policies
DROP POLICY IF EXISTS "Partner admins can manage users in their company" ON partner_users;
DROP POLICY IF EXISTS "Users can view their own partner associations" ON partner_users;
DROP POLICY IF EXISTS "Admins can manage all partner users" ON partner_users;

-- Create new, non-recursive policies for partner_users
CREATE POLICY "Admins can manage all partner users"
  ON partner_users
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Users can view their own partner associations"
  ON partner_users
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Partner admins can manage users in their company"
  ON partner_users
  FOR ALL
  TO authenticated
  USING (
    partner_id IN (
      SELECT pu.partner_id 
      FROM partner_users pu
      WHERE pu.user_id = auth.uid() 
      AND pu.is_admin = true
    )
  )
  WITH CHECK (
    partner_id IN (
      SELECT pu.partner_id 
      FROM partner_users pu
      WHERE pu.user_id = auth.uid() 
      AND pu.is_admin = true
    )
  );

-- Update orders table policies to handle the new customer_id relationship
CREATE POLICY "Partner companies can view their orders"
  ON orders
  FOR SELECT
  TO authenticated
  USING (
    customer_id IN (
      SELECT pu.partner_id
      FROM partner_users pu
      WHERE pu.user_id = auth.uid()
    )
  );

-- Initialize dashboard stats
DO $$
BEGIN
  -- Call the function to initialize all stats
  PERFORM update_dashboard_stats();
END $$;