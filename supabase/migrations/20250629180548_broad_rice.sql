-- Create a function to clear all data from the database except admin users
CREATE OR REPLACE FUNCTION clear_database()
RETURNS void AS $$
BEGIN
    -- Delete data from all tables except auth tables and admin users
    
    -- Delete from vehicle_damage_reports
    DELETE FROM vehicle_damage_reports;
    
    -- Delete from vehicles
    DELETE FROM vehicles;
    
    -- Delete from production_steps
    DELETE FROM production_steps;
    
    -- Delete from recipe_steps
    DELETE FROM recipe_steps;
    
    -- Delete from order_items
    DELETE FROM order_items;
    
    -- Delete from orders
    DELETE FROM orders;
    
    -- Delete from sensor_data
    DELETE FROM sensor_data;
    
    -- Delete from documents
    DELETE FROM documents;
    
    -- Delete from notifications
    DELETE FROM notifications;
    
    -- Delete from settings where not critical
    DELETE FROM settings WHERE category NOT IN ('auth', 'system');
    
    -- Delete from inventory
    DELETE FROM inventory;
    
    -- Delete from production_batches
    DELETE FROM production_batches;
    
    -- Delete from recipes
    DELETE FROM recipes;
    
    -- Delete from products
    DELETE FROM products;
    
    -- Delete from feedback
    DELETE FROM feedback;
    
    -- Delete from work_logs
    DELETE FROM work_logs;
    
    -- Delete from schedules
    DELETE FROM schedules;
    
    -- Delete from survey_responses
    DELETE FROM survey_responses;
    
    -- Delete from survey_questions
    DELETE FROM survey_questions;
    
    -- Delete from surveys
    DELETE FROM surveys;
    
    -- Delete from locations
    DELETE FROM locations;
    
    -- Delete from employees
    DELETE FROM employees;
    
    -- Keep profiles for admin users only
    DELETE FROM profiles WHERE role != 'admin';
    
    -- Reset sequences
    -- This would need to be done for each table with a sequence
    -- Example: ALTER SEQUENCE table_id_seq RESTART WITH 1;
END;
$$ LANGUAGE plpgsql;

-- Create a function to clear all data from a specific table
CREATE OR REPLACE FUNCTION clear_table(table_name text)
RETURNS void AS $$
BEGIN
    EXECUTE 'DELETE FROM ' || quote_ident(table_name);
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to the authenticated role
GRANT EXECUTE ON FUNCTION clear_database() TO authenticated;
GRANT EXECUTE ON FUNCTION clear_table(text) TO authenticated;