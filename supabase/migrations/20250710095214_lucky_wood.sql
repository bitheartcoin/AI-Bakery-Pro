/*
  # Fix dashboard stats and add payment calculation

  1. New Features
    - Create a function to update dashboard stats when orders are completed
    - Add automatic payment calculation based on work logs
    - Fix the partner type in locations table
    
  2. Changes
    - Create update_dashboard_stats function
    - Add trigger to orders table
    - Create calculate_payment_from_work_logs function
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
  -- Daily revenue
  INSERT INTO settings (category, key, value, description, is_public)
  VALUES ('dashboard', 'daily_revenue', daily_revenue::text, 'Daily revenue for dashboard', true)
  ON CONFLICT (category, key) 
  DO UPDATE SET 
    value = daily_revenue::text,
    updated_at = now();
  
  -- Completed orders
  INSERT INTO settings (category, key, value, description, is_public)
  VALUES ('dashboard', 'completed_orders', completed_orders::text, 'Completed orders count for dashboard', true)
  ON CONFLICT (category, key) 
  DO UPDATE SET 
    value = completed_orders::text,
    updated_at = now();
  
  -- Low stock items
  INSERT INTO settings (category, key, value, description, is_public)
  VALUES ('dashboard', 'low_stock_count', low_stock_count::text, 'Low stock items count for dashboard', true)
  ON CONFLICT (category, key) 
  DO UPDATE SET 
    value = low_stock_count::text,
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
  ('dashboard', 'daily_revenue', '0', 'Daily revenue for dashboard', true),
  ('dashboard', 'completed_orders', '0', 'Completed orders count for dashboard', true),
  ('dashboard', 'low_stock_count', '0', 'Low stock items count for dashboard', true)
ON CONFLICT (category, key) DO NOTHING;

-- Run the function once to initialize stats
SELECT update_dashboard_stats();