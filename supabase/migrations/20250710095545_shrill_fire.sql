/*
  # Dashboard Statistics Tracking

  1. New Features
    - Creates a function to update dashboard statistics
    - Sets up a trigger to automatically update stats when orders change
    - Initializes dashboard statistics in the settings table
    
  2. Changes
    - Adds trigger on orders table
    - Creates dashboard stats entries in settings table
    - Uses proper JSON formatting for settings values
*/

-- Create a function to update dashboard stats
CREATE OR REPLACE FUNCTION update_dashboard_stats()
RETURNS TRIGGER AS $$
DECLARE
  daily_revenue NUMERIC := 0;
  completed_orders INTEGER := 0;
  low_stock_count INTEGER := 0;
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
  
  -- Update dashboard stats
  -- Daily revenue - cast to jsonb
  INSERT INTO settings (category, key, value, description, is_public)
  VALUES ('dashboard', 'daily_revenue', to_jsonb(daily_revenue), 'Daily revenue for dashboard', true)
  ON CONFLICT (category, key) 
  DO UPDATE SET 
    value = to_jsonb(daily_revenue),
    updated_at = now();
  
  -- Completed orders - cast to jsonb
  INSERT INTO settings (category, key, value, description, is_public)
  VALUES ('dashboard', 'completed_orders', to_jsonb(completed_orders), 'Completed orders count for dashboard', true)
  ON CONFLICT (category, key) 
  DO UPDATE SET 
    value = to_jsonb(completed_orders),
    updated_at = now();
  
  -- Low stock items - cast to jsonb
  INSERT INTO settings (category, key, value, description, is_public)
  VALUES ('dashboard', 'low_stock_count', to_jsonb(low_stock_count), 'Low stock items count for dashboard', true)
  ON CONFLICT (category, key) 
  DO UPDATE SET 
    value = to_jsonb(low_stock_count),
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for orders table
DROP TRIGGER IF EXISTS trigger_update_dashboard_stats_orders ON orders;

CREATE TRIGGER trigger_update_dashboard_stats_orders
AFTER INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_dashboard_stats();

-- Initialize dashboard stats
INSERT INTO settings (category, key, value, description, is_public)
VALUES 
  ('dashboard', 'daily_revenue', '0'::jsonb, 'Daily revenue for dashboard', true),
  ('dashboard', 'completed_orders', '0'::jsonb, 'Completed orders count for dashboard', true),
  ('dashboard', 'low_stock_count', '0'::jsonb, 'Low stock items count for dashboard', true)
ON CONFLICT (category, key) DO NOTHING;

-- Initialize stats with a direct query instead of calling the trigger function
DO $$
DECLARE
  daily_revenue NUMERIC := 0;
  completed_orders INTEGER := 0;
  low_stock_count INTEGER := 0;
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
  
  -- Update dashboard stats - using to_jsonb() to properly cast values
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
END $$;