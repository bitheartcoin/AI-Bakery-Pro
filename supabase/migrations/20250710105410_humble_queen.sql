/*
  # Fix dashboard stats and add clear_database function

  1. New Features
    - Add clear_database function for admin to reset data
    - Fix dashboard stats to properly track vehicles and employees
    - Add triggers on relevant tables to update stats when data changes
    
  2. Changes
    - Create clear_database() function
    - Update update_dashboard_stats() function to include vehicle and employee counts
    - Add triggers for inventory, vehicles, profiles, and schedules tables
*/

-- Create a function to clear the database (except admin users)
CREATE OR REPLACE FUNCTION clear_database()
RETURNS void AS $$
BEGIN
  -- Disable triggers temporarily to avoid cascading issues
  SET session_replication_role = 'replica';
  
  -- Delete data from tables in a specific order to avoid foreign key issues
  -- Keep only admin users in profiles table
  DELETE FROM work_logs;
  DELETE FROM schedules;
  DELETE FROM delivery_notes;
  DELETE FROM production_steps;
  DELETE FROM production_batches;
  DELETE FROM survey_responses;
  DELETE FROM survey_questions;
  DELETE FROM surveys;
  DELETE FROM feedback;
  DELETE FROM chat_messages;
  DELETE FROM notifications;
  DELETE FROM documents;
  DELETE FROM vehicle_damage_reports;
  DELETE FROM sensor_data;
  DELETE FROM payment_items;
  DELETE FROM payments;
  DELETE FROM order_items;
  DELETE FROM webshop_orders;
  DELETE FROM orders;
  DELETE FROM webshop_product_reviews;
  DELETE FROM webshop_carts;
  DELETE FROM webshop_customers;
  DELETE FROM product_inventory;
  DELETE FROM partner_users;
  DELETE FROM partner_companies;
  DELETE FROM inventory;
  DELETE FROM recipe_steps;
  DELETE FROM employees;
  DELETE FROM vehicles;
  
  -- Delete non-admin profiles
  DELETE FROM profiles WHERE role != 'admin';
  
  -- Re-enable triggers
  SET session_replication_role = 'origin';
  
  -- Update dashboard stats
  PERFORM update_dashboard_stats();
  
  -- Return success message
  RAISE NOTICE 'Database cleared successfully. All data removed except admin users.';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Create triggers for all relevant tables
DROP TRIGGER IF EXISTS trigger_update_dashboard_stats_orders ON orders;
DROP TRIGGER IF EXISTS trigger_update_dashboard_stats_inventory ON inventory;
DROP TRIGGER IF EXISTS trigger_update_dashboard_stats_vehicles ON vehicles;
DROP TRIGGER IF EXISTS trigger_update_dashboard_stats_profiles ON profiles;
DROP TRIGGER IF EXISTS trigger_update_dashboard_stats_schedules ON schedules;

-- Orders trigger
CREATE TRIGGER trigger_update_dashboard_stats_orders
AFTER INSERT OR UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION update_dashboard_stats();

-- Inventory trigger
CREATE TRIGGER trigger_update_dashboard_stats_inventory
AFTER INSERT OR UPDATE ON inventory
FOR EACH ROW
EXECUTE FUNCTION update_dashboard_stats();

-- Vehicles trigger
CREATE TRIGGER trigger_update_dashboard_stats_vehicles
AFTER INSERT OR UPDATE ON vehicles
FOR EACH ROW
EXECUTE FUNCTION update_dashboard_stats();

-- Profiles trigger
CREATE TRIGGER trigger_update_dashboard_stats_profiles
AFTER INSERT OR UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_dashboard_stats();

-- Schedules trigger
CREATE TRIGGER trigger_update_dashboard_stats_schedules
AFTER INSERT OR UPDATE ON schedules
FOR EACH ROW
EXECUTE FUNCTION update_dashboard_stats();

-- Initialize dashboard stats
DO $$
BEGIN
  -- Call the function to initialize all stats
  PERFORM update_dashboard_stats();
END $$;